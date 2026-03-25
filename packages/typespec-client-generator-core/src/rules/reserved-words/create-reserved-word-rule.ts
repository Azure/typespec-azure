import {
  Enum,
  EnumMember,
  Model,
  ModelProperty,
  Operation,
  Union,
  UnionVariant,
  createRule,
  paramMessage,
} from "@typespec/compiler";
import { createTCGCContext } from "../../context.js";
import { getLibraryName } from "../../public-utils.js";
import { LanguageReservedWords } from "./words.js";

/**
 * Creates a linter rule that warns when identifiers conflict with reserved
 * words in a target language. The rule is context-aware: different reserved
 * word sets can be specified for models, properties, operations, enum types,
 * and enum members.
 *
 * @param language - The scope string for the language (e.g. "python", "csharp").
 *                   Used with `getLibraryName` to resolve `@clientName` overrides.
 * @param displayName - Human-readable language name for diagnostic messages (e.g. "Python", "C#").
 * @param reservedWords - Context-specific reserved word sets.
 */
export function createReservedWordRule(
  language: string,
  displayName: string,
  reservedWords: LanguageReservedWords,
) {
  return createRule({
    name: `no-reserved-words-${language}`,
    description: `Warns when identifiers conflict with ${displayName} reserved words.`,
    severity: "warning",
    url: `https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-reserved-words-${language}`,
    messages: {
      default: paramMessage`'${"name"}' cannot be used as a ${"context"} name since it is a reserved word in ${"language"}. Consider using the @clientName decorator to rename it for ${"language"} code generation.`,
    },
    create(context) {
      const tcgcContext = createTCGCContext(
        context.program,
        "@azure-tools/typespec-client-generator-core",
        {
          mutateNamespace: false,
        },
      );

      function check(
        target: Model | ModelProperty | Operation | Enum | EnumMember | Union | UnionVariant,
        wordSet: ReadonlySet<string>,
        contextName: string,
      ) {
        if (typeof target.name !== "string") return;
        const effectiveName = getLibraryName(tcgcContext, target, language);
        if (wordSet.has(effectiveName)) {
          context.reportDiagnostic({
            format: { name: effectiveName, language: displayName, context: contextName },
            target,
          });
        }
      }

      const parameterModels = new WeakSet<Model>();

      return {
        model: (node: Model) => check(node, reservedWords.model, "model"),
        modelProperty: (node: ModelProperty) => {
          if (node.model && parameterModels.has(node.model)) {
            check(node, reservedWords.parameter, "parameter");
          } else {
            check(node, reservedWords.property, "property");
          }
        },
        operation: (node: Operation) => {
          check(node, reservedWords.operation, "operation");
          parameterModels.add(node.parameters);
        },
        enum: (node: Enum) => {
          check(node, reservedWords.enumType, "enum");
          for (const member of node.members.values()) {
            check(member, reservedWords.enumMember, "enum member");
          }
        },
        union: (node: Union) => check(node, reservedWords.enumType, "union"),
        unionVariant: (node: UnionVariant) =>
          check(node, reservedWords.enumMember, "union variant"),
      };
    },
  });
}
