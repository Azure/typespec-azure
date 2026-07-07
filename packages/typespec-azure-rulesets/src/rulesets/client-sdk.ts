import type { LinterRuleSet } from "@typespec/compiler";

// Rules that apply to specs configured to emit a client SDK. Enable by extending
// "@azure-tools/typespec-azure-rulesets/client-sdk" in tspconfig.yaml.
export default {
  enable: {
    "@azure-tools/typespec-client-generator-core/csharp-no-url-suffix": true,
    "@azure-tools/typespec-client-generator-core/csharp-no-single-word-model-name": true,
  },
} satisfies LinterRuleSet;
