import type { LinterRuleSet } from "@typespec/compiler";

// Rules that apply to specs configured to emit a client SDK. Enable by extending
// "@azure-tools/typespec-azure-rulesets/client-sdk" in tspconfig.yaml.
export default {
  enable: {
    "@azure-tools/typespec-client-generator-core/csharp-no-url-suffix": true,
    "@azure-tools/typespec-client-generator-core/csharp-model-suffix": true,
  },
  disable: {
    "@azure-tools/typespec-client-generator-core/get-operation-name":
      "Disabled to avoid introducing diagnostics into existing SDK specs during migration.",
    "@azure-tools/typespec-client-generator-core/csharp-use-standard-acronyms":
      "Disabled until the C# emitter handles standard acronym casing.",
  },
} satisfies LinterRuleSet;
