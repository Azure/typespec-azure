import { createRule, defineCodeFix, getSourceLocation, Model, paramMessage } from "@typespec/compiler";

function createReplaceRequestWithContentCodeFix(target: Model, name: string) {
  const newName = name.replace(/Request$/, "Content");
  return defineCodeFix({
    id: "replace-request-with-content",
    label: `Add @clientName("${newName}", "csharp")`,
    fix: (fixContext) => {
      const location = getSourceLocation(target);
      const text = location.file.text;
      let lineStart = location.pos;
      while (lineStart > 0 && text[lineStart - 1] !== "\n") {
        lineStart--;
      }
      let indentEnd = lineStart;
      while (indentEnd < text.length && (text[indentEnd] === " " || text[indentEnd] === "\t")) {
        indentEnd++;
      }
      const indent = text.slice(lineStart, indentEnd);
      const updatedLocation = { ...location, pos: lineStart };
      return fixContext.prependText(
        updatedLocation,
        `${indent}@clientName("${newName}", "csharp")\n`,
      );
    },
  });
}

export const modelNameRequestSuffixRule = createRule({
  name: "arm-model-name-request-suffix",
  description: "Model names should not end with 'Request'. Use 'Content' suffix instead.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-model-name-request-suffix",
  messages: {
    default: paramMessage`Model name '${"name"}' ends with 'Request'. Consider renaming it to '${"suggestion"}' or use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
  },
  create(context) {
    // NOTE: Cannot use getLibraryName/createTCGCContext here because
    // typespec-azure-resource-manager does not depend on typespec-client-generator-core.
    // This means we can only check the raw TypeSpec model name, NOT the C#-scoped
    // name from @clientName overrides. If a model has @clientName("FooContent", "csharp")
    // but its TypeSpec name is still FooRequest, this rule will STILL flag it as a
    // false positive.
    return {
      model: (model: Model) => {
        if (typeof model.name !== "string") return;
        const name = model.name;
        if (!name.endsWith("Request")) return;
        const suggestion = name.replace(/Request$/, "Content");
        context.reportDiagnostic({
          format: {
            name,
            suggestion,
          },
          target: model,
          codefixes: [createReplaceRequestWithContentCodeFix(model, name)],
        });
      },
    };
  },
});
