import { Model, createRule, getNamespaceFullName, paramMessage } from "@typespec/compiler";
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
    messageId: "request",
    badSuffix: "Request",
    replacementSuffix: "Content",
  },
  {
    messageId: "response",
    badSuffix: "Response",
    replacementSuffix: "Result",
    shouldSkip: isStandardAzureCoreErrorResponse,
  },
];

function getSuggestedName(name: string, convention: SuffixConvention) {
  return name.slice(0, -convention.badSuffix.length) + convention.replacementSuffix;
}

export const csharpModelSuffixRule = createRule({
  name: "csharp-model-suffix",
  description: "Model names should use recommended suffixes for C# SDKs.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/csharp-model-suffix",
  messages: {
    options: paramMessage`Model '${"modelName"}' ends with 'Options'. Use 'Config' suffix instead (e.g. '${"suggestion"}'). Use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
    request: paramMessage`Model '${"modelName"}' ends with 'Request'. Use 'Content' suffix instead (e.g. '${"suggestion"}'). Use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
    response: paramMessage`Model '${"modelName"}' ends with 'Response'. Use 'Result' suffix instead (e.g. '${"suggestion"}'). Use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );

    return {
      model: (model: Model) => {
        if (model.node === undefined) return;

        const csharpName = getLibraryName(tcgcContext, model, "csharp");
        const convention = suffixConventions.find(
          (x) => csharpName.endsWith(x.badSuffix) && !x.shouldSkip?.(model, csharpName),
        );
        if (convention === undefined) return;

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
      },
    };
  },
});

function isStandardAzureCoreErrorResponse(model: Model, csharpName: string) {
  if (csharpName !== "ErrorResponse") return false;
  const namespace = model.namespace ? getNamespaceFullName(model.namespace) : "";
  return (
    namespace === "Azure.Core.Foundations" || namespace === "Azure.ResourceManager.CommonTypes"
  );
}
