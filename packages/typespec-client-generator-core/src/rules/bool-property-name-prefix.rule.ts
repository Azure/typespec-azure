import { createRule, ModelProperty, paramMessage, Type } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getLibraryName } from "../public-utils.js";

const ALLOWED_PREFIXES = ["Is", "Has", "Can", "Should", "Are", "Was", "Will", "Does", "Do"];

function isBooleanType(type: Type): boolean {
  if (type.kind !== "Scalar") return false;
  let current: Type | undefined = type;
  while (current && current.kind === "Scalar") {
    if (current.name === "boolean") return true;
    current = current.baseScalar;
  }
  return false;
}

function startsWithAllowedPrefix(name: string): boolean {
  for (const prefix of ALLOWED_PREFIXES) {
    if (name.length > prefix.length && name.startsWith(prefix)) {
      const next = name.charAt(prefix.length);
      if (next >= "A" && next <= "Z") {
        return true;
      }
    }
  }
  return false;
}

function toPascalCase(name: string): string {
  if (name.length === 0) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export const boolPropertyNamePrefixRule = createRule({
  name: "bool-property-name-prefix",
  description:
    "Boolean property and parameter names should start with a verb prefix such as Is, Has, Can, Should, etc.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/bool-property-name-prefix",
  messages: {
    default: paramMessage`Boolean property or parameter '${"name"}' should start with one of the following verb prefixes followed by an uppercase letter: ${"prefixes"}. Consider renaming it (for example to '${"suggestion"}') or use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      {
        mutateNamespace: false,
      },
    );
    return {
      modelProperty: (property: ModelProperty) => {
        if (!isBooleanType(property.type)) return;
        // The C# emitter PascalCases property/parameter names, so apply the same
        // transformation before checking for an allowed verb prefix.
        const csharpName = toPascalCase(getLibraryName(tcgcContext, property, "csharp"));
        if (startsWithAllowedPrefix(csharpName)) return;
        const suggestion = `Is${csharpName}`;
        context.reportDiagnostic({
          format: {
            name: csharpName,
            prefixes: ALLOWED_PREFIXES.join(", "),
            suggestion,
          },
          target: property,
        });
      },
    };
  },
});
