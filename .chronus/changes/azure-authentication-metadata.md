---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/azure-http-specs"
---

Add `@azureServiceConfigurations` to pair named endpoints with OAuth URLs and scopes, authored as value records with `typeref(...)` references to authentication types and endpoint parameter models. Enable the experimental `typeref` compiler feature to use these references. Preserve AND groups and credential alternatives, project client-local catalogs through TCGC while keeping existing initialization fields aligned with the required `public` default, and reject inconsistent pairings when merging services. Add shared Public/Government configuration Spector scenarios.
