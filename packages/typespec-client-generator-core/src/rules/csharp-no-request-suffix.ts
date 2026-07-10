import { createCSharpModelSuffixRule } from "./csharp-model-suffix-utils.js";

export const csharpNoRequestSuffixRule = createCSharpModelSuffixRule({
  name: "csharp-no-request-suffix",
  badSuffix: "Request",
  replacementSuffix: "Content",
  description: "Model names ending with 'Request' should use 'Content' suffix instead for C# SDKs.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/csharp-no-request-suffix",
});
