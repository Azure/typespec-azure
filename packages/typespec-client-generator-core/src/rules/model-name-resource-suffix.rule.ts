import {
  createRule,
  defineCodeFix,
  getSourceLocation,
  Model,
  paramMessage,
} from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getLibraryName } from "../public-utils.js";

function createDropResourceSuffixCodeFix(target: Model, csharpName: string) {
  const newName = csharpName.replace(/Resource$/, "");
  return defineCodeFix({
    id: "drop-resource-suffix",
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

function createRenameToDataCodeFix(target: Model, csharpName: string) {
  const newName = csharpName.replace(/Resource$/, "Data");
  return defineCodeFix({
    id: "rename-resource-to-data",
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

export const modelNameResourceSuffixRule = createRule({
  name: "model-name-resource-suffix",
  description:
    "Model names ending with 'Resource' should drop the suffix or rename to 'Data'/'Info'.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/model-name-resource-suffix",
  messages: {
    default: paramMessage`Model name '${"name"}' ends with 'Resource'. Consider dropping the suffix (e.g. '${"suggestion"}') or use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
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
        if (!csharpName.endsWith("Resource")) return;
        // Don't flag if the name is exactly "Resource" (too generic to lint)
        if (csharpName === "Resource") return;
        // Don't flag well-known base types like TrackedResource, ProxyResource, ExtensionResource
        const wellKnown = [
          "TrackedResource",
          "ProxyResource",
          "ExtensionResource",
          "GenericResource",
        ];
        if (wellKnown.includes(csharpName)) return;

        const baseName = csharpName.replace(/Resource$/, "");
        const suggestion = baseName;
        const codefixes = [
          createDropResourceSuffixCodeFix(model, csharpName),
          createRenameToDataCodeFix(model, csharpName),
        ];

        context.reportDiagnostic({
          format: {
            name: csharpName,
            suggestion,
          },
          target: model,
          codefixes,
        });
      },
    };
  },
});
