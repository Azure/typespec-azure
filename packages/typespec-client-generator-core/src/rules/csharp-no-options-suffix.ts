import { createCSharpModelSuffixRule } from "./csharp-model-suffix-utils.js";

export const csharpNoOptionsSuffixRule = createCSharpModelSuffixRule({
  name: "csharp-no-options-suffix",
  badSuffix: "Options",
  replacementSuffix: "Config",
  description:
    "Model names ending with 'Options' should use 'Config' suffix instead for C# SDKs, except client options.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/csharp-no-options-suffix",
  shouldSkip: (_model, csharpName) => csharpName.endsWith("ClientOptions"),
});
