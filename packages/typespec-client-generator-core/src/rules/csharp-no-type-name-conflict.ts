import type { Enum, Model, Namespace, Program, Union } from "@typespec/compiler";
import {
  createRule,
  getNamespaceFullName,
  isGlobalNamespace,
  isService,
  paramMessage,
} from "@typespec/compiler";
import { pascalCase } from "change-case";
import { createTCGCContext } from "../context.js";
import { TCGCContext } from "../interfaces.js";
import { getLibraryName } from "../public-utils.js";
import { csharpReservedTypeNameConflicts } from "./azc0034-reserved-type-names.generated.js";
import { createClientTspAugmentDecoratorCodeFix } from "./codefix-helpers.js";

type NamedSdkType = Model | Enum | Union;

const skippedLibraryNamespaces = [
  "Azure.Core",
  "Azure.ResourceManager",
  "Azure.ClientGenerator.Core",
];

export const csharpNoTypeNameConflictRule = createRule({
  name: "csharp-no-type-name-conflict",
  description: "C# generated type names should not conflict with reserved Azure SDK type names.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/csharp-no-type-name-conflict",
  messages: {
    default: paramMessage`Type name '${"typeName"}' conflicts with '${"conflictName"}' from '${"packageName"}'. Use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );

    function check(type: NamedSdkType) {
      if (type.node === undefined || shouldSkipType(type)) return;

      const csharpName = getLibraryName(tcgcContext, type, "csharp");
      const metadataName = getCSharpMetadataName(type, csharpName);
      const conflict = csharpReservedTypeNameConflicts[metadataName];
      if (conflict === undefined) return;

      const suggestion = createNameSuggestion(context.program, tcgcContext, type, csharpName);
      context.reportDiagnostic({
        target: type,
        format: {
          typeName: metadataName,
          conflictName: conflict.conflictName,
          packageName: conflict.packageName,
          suggestion,
        },
        codefixes: [
          createClientTspAugmentDecoratorCodeFix(type, "clientName", context.program, [
            `"${suggestion}"`,
            `"csharp"`,
          ]),
        ],
      });
    }

    return {
      model: check,
      enum: check,
      union: check,
    };
  },
});

function getCSharpMetadataName(type: NamedSdkType, csharpName: string): string {
  if ((type.kind === "Model" || type.kind === "Union") && type.templateMapper === undefined) {
    const templateParameterCount = getTemplateParameterCount(type);
    if (templateParameterCount > 0) {
      return `${csharpName}\`${templateParameterCount}`;
    }
  }
  return csharpName;
}

function getTemplateParameterCount(type: Model | Union): number {
  const node = type.node;
  if (node && "templateParameters" in node && Array.isArray(node.templateParameters)) {
    return node.templateParameters.length;
  }
  return 0;
}

function shouldSkipType(type: NamedSdkType): boolean {
  const namespaceName = type.namespace ? getNamespaceFullName(type.namespace) : "";
  return skippedLibraryNamespaces.some(
    (skipped) => namespaceName === skipped || namespaceName.startsWith(`${skipped}.`),
  );
}

function createNameSuggestion(
  program: Program,
  context: TCGCContext,
  type: NamedSdkType,
  csharpName: string,
): string {
  const prefix = getContextPrefix(program, context, type);
  const basePrefix = prefix === "" ? "Custom" : prefix;
  for (const suffix of ["", "Info", "Data"]) {
    const candidate = `${basePrefix}${csharpName}${suffix}`;
    if (csharpReservedTypeNameConflicts[candidate] === undefined) {
      return candidate;
    }
  }
  return `${basePrefix}${csharpName}Type`;
}

function getContextPrefix(program: Program, context: TCGCContext, type: NamedSdkType): string {
  const serviceNamespace = getEnclosingServiceNamespace(program, type.namespace);
  const namespaceForPrefix = serviceNamespace ?? getNearestUserNamespace(program, type.namespace);
  if (namespaceForPrefix === undefined) return "";

  const namespaceName = getLibraryName(context, namespaceForPrefix, "csharp").replace(
    /Client$/,
    "",
  );
  return pascalCase(namespaceName);
}

function getEnclosingServiceNamespace(
  program: Program,
  namespace: Namespace | undefined,
): Namespace | undefined {
  let current = namespace;
  while (current !== undefined) {
    if (isService(program, current)) return current;
    current = current.namespace;
  }
  return undefined;
}

function getNearestUserNamespace(
  program: Program,
  namespace: Namespace | undefined,
): Namespace | undefined {
  let current = namespace;
  while (current !== undefined) {
    if (!isGlobalNamespace(program, current) && current.name !== "TypeSpec") return current;
    current = current.namespace;
  }
  return undefined;
}
