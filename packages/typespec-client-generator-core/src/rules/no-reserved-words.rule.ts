import {
  createRule,
  Enum,
  EnumMember,
  Model,
  ModelProperty,
  Operation,
  paramMessage,
  Union,
  UnionVariant,
} from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getLibraryName } from "../public-utils.js";
import {
  csharpReservedWords,
  javaReservedWords,
  javascriptReservedWords,
  LanguageReservedWords,
  pythonReservedWords,
} from "./reserved-words.js";

interface LanguageConfig {
  /** Scope string passed to `getLibraryName` to resolve `@clientName` overrides. */
  scope: string;
  /** Human-readable name for diagnostic messages. */
  displayName: string;
  /** Context-specific reserved word sets. */
  words: LanguageReservedWords;
}

const languages: readonly LanguageConfig[] = [
  { scope: "python", displayName: "Python", words: pythonReservedWords },
  { scope: "csharp", displayName: "C#", words: csharpReservedWords },
  { scope: "java", displayName: "Java", words: javaReservedWords },
  { scope: "javascript", displayName: "JavaScript", words: javascriptReservedWords },
];

export const noReservedWordsRule = createRule({
  name: "no-reserved-words",
  description:
    "Warns when identifiers conflict with reserved words in target languages (Python, C#, Java, JavaScript).",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-reserved-words",
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
      getWordSet: (words: LanguageReservedWords) => ReadonlySet<string>,
      contextName: string,
    ) {
      if (typeof target.name !== "string") return;
      for (const lang of languages) {
        const effectiveName = getLibraryName(tcgcContext, target, lang.scope);
        if (getWordSet(lang.words).has(effectiveName)) {
          context.reportDiagnostic({
            format: { name: effectiveName, language: lang.displayName, context: contextName },
            target,
          });
        }
      }
    }

    const parameterModels = new WeakSet<Model>();

    return {
      model: (node: Model) => check(node, (w) => w.model, "model"),
      modelProperty: (node: ModelProperty) => {
        if (node.model && parameterModels.has(node.model)) {
          check(node, (w) => w.parameter, "parameter");
        } else {
          check(node, (w) => w.property, "property");
        }
      },
      operation: (node: Operation) => {
        check(node, (w) => w.operation, "operation");
        parameterModels.add(node.parameters);
      },
      enum: (node: Enum) => {
        check(node, (w) => w.enumType, "enum");
        for (const member of node.members.values()) {
          check(member, (w) => w.enumMember, "enum member");
        }
      },
      union: (node: Union) => check(node, (w) => w.enumType, "union"),
      unionVariant: (node: UnionVariant) => check(node, (w) => w.enumMember, "union variant"),
    };
  },
});
