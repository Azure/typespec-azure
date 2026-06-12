import {
  createRule,
  defineCodeFix,
  getSourceLocation,
  Model,
  paramMessage,
} from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getLibraryName } from "../public-utils.js";

function createReplaceRequestWithContentCodeFix(target: Model, csharpName: string) {
  const newName = csharpName.replace(/Request$/, "Content");
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
  name: "model-name-request-suffix",
  description: "Model names should not end with 'Request'. Use 'Content' suffix instead.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/model-name-request-suffix",
  messages: {
    default: paramMessage`Model name '${"name"}' ends with 'Request'. Consider renaming it to '${"suggestion"}' or use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
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
      model: (model: Model) => {
        const csharpName = getLibraryName(tcgcContext, model, "csharp");
        if (!csharpName.endsWith("Request")) return;
        const suggestion = csharpName.replace(/Request$/, "Content");
        context.reportDiagnostic({
          format: {
            name: csharpName,
            suggestion,
          },
          target: model,
          codefixes: [createReplaceRequestWithContentCodeFix(model, csharpName)],
        });
      },
    };
  },
});
