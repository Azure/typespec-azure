---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Fix Spector e2e test declaration-rollup generation to load api-extractor's default config via the `JsonFile` helper instead of the removed `ExtractorConfig._defaultConfig` static property, which no longer exists in newer `@microsoft/api-extractor` versions.
