import {
  createRule,
  fileRef,
  isNullType,
  paramMessage,
  type ModelProperty,
  type Type,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { split } from "change-case";
import nlp from "compromise/two";
import { createTCGCContext } from "../context.js";
import { getLibraryName } from "../public-utils.js";
import { createClientTspAugmentDecoratorCodeFix } from "./codefix-helpers.js";

export const csharpUseBoolPrefixRule = createRule({
  name: "csharp-use-bool-prefix",
  description:
    "Boolean properties and parameters should start with a verb and read affirmatively for C# SDKs.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/csharp-use-bool-prefix",
  docs: fileRef.fromPackageRoot("src/rules/csharp-use-bool-prefix.md"),
  messages: {
    default: paramMessage`Boolean property or parameter '${"propertyName"}' should start with a verb followed by another word. Choose a prefix appropriate to its meaning, such as 'Is', 'Has', 'Can', or 'Should'. Use a C#-scoped @clientName override to rename it for C#.`,
    negative: paramMessage`Boolean property or parameter '${"propertyName"}' should read affirmatively. Review its name and boolean value semantics before renaming; a C#-scoped @clientName override does not invert values.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );
    const scalar = $(context.program).scalar;
    const reportedNames = new Map<ModelProperty["node"], Set<string>>();

    function isBoolean(type: Type, visiting = new Set<Type>()): boolean {
      if (type.kind === "Boolean" || scalar.extendsBoolean(type)) return true;
      if (type.kind !== "Union" || visiting.has(type)) return false;
      visiting.add(type);
      const variants = [...type.variants.values()].filter((variant) => !isNullType(variant.type));
      const result =
        variants.length > 0 && variants.every((variant) => isBoolean(variant.type, visiting));
      visiting.delete(type);
      return result;
    }

    return {
      modelProperty(property) {
        if (property.node === undefined || !isBoolean(property.type)) return;

        const propertyName = getLibraryName(tcgcContext, property, "csharp");
        const pascalName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
        const words = split(propertyName);
        const hasNegation = words.some((word) =>
          ["not", "no", "never"].includes(word.toLowerCase()),
        );
        if (!hasNegation && words.length > 1 && nlp(words[0].toLowerCase()).has("#Verb")) return;

        // Spread, model-is, and template copies can share the same source node.
        const names = reportedNames.get(property.node) ?? new Set<string>();
        if (names.has(propertyName)) return;
        names.add(propertyName);
        reportedNames.set(property.node, names);

        // A name-only override cannot safely invert the meaning of boolean values.
        if (hasNegation) {
          context.reportDiagnostic({
            target: property,
            messageId: "negative",
            format: { propertyName },
          });
          return;
        }

        context.reportDiagnostic({
          target: property,
          format: { propertyName },
          codefixes: ["Is", "Has", "Can", "Should"].map((prefix) => ({
            ...createClientTspAugmentDecoratorCodeFix(property, "clientName", context.program, [
              JSON.stringify(`${prefix}${pascalName}`),
              '"csharp"',
            ]),
            id: `add-clientName-in-client-tsp-${prefix.toLowerCase()}`,
          })),
        });
      },
    };
  },
});
