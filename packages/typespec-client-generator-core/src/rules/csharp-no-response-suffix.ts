import {
  createCSharpModelSuffixRule,
  isStandardAzureCoreErrorResponse,
} from "./csharp-model-suffix-utils.js";

export const csharpNoResponseSuffixRule = createCSharpModelSuffixRule({
  name: "csharp-no-response-suffix",
  badSuffix: "Response",
  replacementSuffix: "Result",
  description: "Model names ending with 'Response' should use 'Result' suffix instead for C# SDKs.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/csharp-no-response-suffix",
  shouldSkip: isStandardAzureCoreErrorResponse,
});
