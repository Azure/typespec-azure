---
changeKind: feature
packages:
  - "@azure-tools/typespec-metadata"
---

Add `apiVersion` field to `LanguagePackageMetadata` resolved via TCGC's `createSdkContext`. Values: `"all"` when configured for all versions, `"multiple-versions"` for multi-service configs, the actual resolved version string, or `undefined` when unavailable. Also adds `api-version` as a passthrough emitter option.
