import {
  Model,
  Type,
  createRule,
  fileRef,
  getNamespaceFullName,
  paramMessage,
  walkPropertiesInherited,
} from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";
import { createTCGCContext } from "../context.js";
import { getLibraryName } from "../public-utils.js";
import { createClientTspAugmentDecoratorCodeFix } from "./codefix-helpers.js";

interface SuffixConvention {
  messageId: "options" | "request" | "response";
  badSuffix: string;
  replacementSuffix: string;
  shouldSkip?: (model: Model, csharpName: string) => boolean;
}

const suffixConventions: readonly SuffixConvention[] = [
  {
    messageId: "options",
    badSuffix: "Options",
    replacementSuffix: "Config",
    shouldSkip: (_model, csharpName) => csharpName.endsWith("ClientOptions"),
  },
  {
    messageId: "response",
    badSuffix: "Response",
    replacementSuffix: "Result",
    shouldSkip: isStandardAzureCoreErrorResponse,
  },
];

const bodySuffixes = ["Parameters", "Parameter", "Request"] as const;
type BodySuffix = (typeof bodySuffixes)[number];
type BodyRole = "patch" | "content" | "response" | "other";
type ExpectedBodySuffix = "Patch" | "Content";

function getSuggestedName(name: string, convention: SuffixConvention) {
  return name.slice(0, -convention.badSuffix.length) + convention.replacementSuffix;
}

export const csharpModelSuffixRule = createRule({
  name: "csharp-model-suffix",
  docs: fileRef.fromPackageRoot("src/rules/csharp-model-suffix.md"),
  description: "Model names should use recommended suffixes for C# SDKs.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/csharp-model-suffix",
  messages: {
    options: paramMessage`Model '${"modelName"}' ends with 'Options'. Use 'Config' suffix instead (e.g. '${"suggestion"}'). Use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
    request: paramMessage`Model '${"modelName"}' ends with 'Request'. Use 'Content' suffix instead (e.g. '${"suggestion"}'). Use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
    response: paramMessage`Model '${"modelName"}' ends with 'Response'. Use 'Result' suffix instead (e.g. '${"suggestion"}'). Use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
    patchBody: paramMessage`Model '${"modelName"}' is used as a direct PATCH body. Use 'Patch' suffix instead (e.g. '${"suggestion"}'). Use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
    contentBody: paramMessage`Model '${"modelName"}' is used as a direct PUT/POST body or nested request content. Use 'Content' suffix instead (e.g. '${"suggestion"}'). Use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );
    const bodyRoles = new Map<Model, Set<BodyRole>>();

    return {
      root: () => collectBodyRoles(context.program, bodyRoles),
      model: (model: Model) => {
        if (model.node === undefined) return;

        const csharpName = getLibraryName(tcgcContext, model, "csharp");
        const bodySuffix = bodySuffixes.find((suffix) => csharpName.endsWith(suffix));
        if (bodySuffix !== undefined) {
          const roles = bodyRoles.get(model);
          const expectedSuffix = roles === undefined ? undefined : getExpectedBodySuffix(roles);
          if (expectedSuffix !== undefined) {
            reportBodySuffixDiagnostic(model, csharpName, bodySuffix, expectedSuffix);
            return;
          }
          if (roles !== undefined && hasConflictingRoles(roles)) return;

          if (bodySuffix === "Request") {
            reportSuffixDiagnostic(model, csharpName, {
              messageId: "request",
              badSuffix: "Request",
              replacementSuffix: "Content",
            });
          }
          return;
        }

        const convention = suffixConventions.find(
          (x) => csharpName.endsWith(x.badSuffix) && !x.shouldSkip?.(model, csharpName),
        );
        if (convention === undefined) return;

        reportSuffixDiagnostic(model, csharpName, convention);
      },
    };

    function reportSuffixDiagnostic(
      model: Model,
      csharpName: string,
      convention: SuffixConvention,
    ) {
      const suggestion = getSuggestedName(csharpName, convention);
      context.reportDiagnostic({
        messageId: convention.messageId,
        format: { modelName: csharpName, suggestion },
        target: model,
        codefixes: [
          createClientTspAugmentDecoratorCodeFix(model, "clientName", context.program, [
            `"${suggestion}"`,
            `"csharp"`,
          ]),
        ],
      });
    }

    function reportBodySuffixDiagnostic(
      model: Model,
      csharpName: string,
      badSuffix: BodySuffix,
      expectedSuffix: ExpectedBodySuffix,
    ) {
      const suggestion = getBodySuggestion(csharpName, badSuffix, expectedSuffix);
      context.reportDiagnostic({
        messageId: expectedSuffix === "Patch" ? "patchBody" : "contentBody",
        format: { modelName: csharpName, suggestion },
        target: model,
        codefixes: [
          createClientTspAugmentDecoratorCodeFix(model, "clientName", context.program, [
            `"${suggestion}"`,
            `"csharp"`,
          ]),
        ],
      });
    }
  },
});

function getBodySuggestion(
  csharpName: string,
  badSuffix: BodySuffix,
  expectedSuffix: ExpectedBodySuffix,
) {
  let baseName = csharpName.slice(0, -badSuffix.length);
  if (expectedSuffix === "Patch") {
    baseName = baseName.replace(/(?:Update|Patch)$/, "");
  }
  return baseName + expectedSuffix;
}

function getExpectedBodySuffix(roles: Set<BodyRole>): ExpectedBodySuffix | undefined {
  if (hasConflictingRoles(roles)) return undefined;
  if (roles.has("patch")) return "Patch";
  if (roles.has("content")) return "Content";
  return undefined;
}

function hasConflictingRoles(roles: Set<BodyRole>) {
  const hasRequestRole = roles.has("patch") || roles.has("content") || roles.has("other");
  return (
    (roles.has("patch") && (roles.has("content") || roles.has("other"))) ||
    (hasRequestRole && roles.has("response"))
  );
}

function collectBodyRoles(
  program: Parameters<typeof getAllHttpServices>[0],
  roles: Map<Model, Set<BodyRole>>,
) {
  const [services] = getAllHttpServices(program);
  for (const service of services) {
    for (const operation of service.operations) {
      const body = operation.parameters.body;
      if (body !== undefined) {
        const directRole = getDirectBodyRole(operation.verb);
        if (body.type.kind === "Model" && body.type.name !== "") {
          addRole(roles, body.type, directRole);
          collectNestedModels(body.type, directRole === "patch" ? "content" : directRole, roles);
        } else {
          collectFirstNamedModels(
            body.type,
            directRole === "patch" ? "content" : directRole,
            roles,
          );
        }
      }

      for (const response of operation.responses) {
        for (const content of response.responses) {
          if (content.body !== undefined) {
            collectFirstNamedModels(content.body.type, "response", roles);
          }
        }
      }
    }
  }
}

function getDirectBodyRole(verb: string): BodyRole {
  if (verb === "patch") return "patch";
  if (verb === "put" || verb === "post") return "content";
  return "other";
}

function collectNestedModels(root: Model, role: BodyRole, roles: Map<Model, Set<BodyRole>>) {
  const visited = new Set<Type>([root]);
  for (const property of walkPropertiesInherited(root)) {
    collectFirstNamedModels(property.type, role, roles, visited);
  }
  if (root.indexer !== undefined) {
    collectFirstNamedModels(root.indexer.value, role, roles, visited);
  }
}

function collectFirstNamedModels(
  type: Type,
  role: BodyRole,
  roles: Map<Model, Set<BodyRole>>,
  visited = new Set<Type>(),
) {
  if (visited.has(type)) return;
  visited.add(type);

  switch (type.kind) {
    case "Model":
      if (type.indexer !== undefined) {
        collectFirstNamedModels(type.indexer.value, role, roles, visited);
      } else if (type.name !== "") {
        addRole(roles, type, role);
      } else {
        for (const property of walkPropertiesInherited(type)) {
          collectFirstNamedModels(property.type, role, roles, visited);
        }
      }
      break;
    case "Tuple":
      for (const value of type.values) {
        collectFirstNamedModels(value, role, roles, visited);
      }
      break;
    case "Union":
      for (const variant of type.variants.values()) {
        collectFirstNamedModels(variant.type, role, roles, visited);
      }
      break;
  }
}

function addRole(roles: Map<Model, Set<BodyRole>>, model: Model, role: BodyRole) {
  let modelRoles = roles.get(model);
  if (modelRoles === undefined) {
    modelRoles = new Set();
    roles.set(model, modelRoles);
  }
  modelRoles.add(role);
}

function isStandardAzureCoreErrorResponse(model: Model, csharpName: string) {
  if (csharpName !== "ErrorResponse") return false;
  const namespace = model.namespace ? getNamespaceFullName(model.namespace) : "";
  return (
    namespace === "Azure.Core.Foundations" || namespace === "Azure.ResourceManager.CommonTypes"
  );
}
