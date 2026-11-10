---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
---

Add `@azureServiceConfigurations` to pair named endpoints with OAuth URLs and scopes, authored as value records with constrained `typeref(...)` references to authentication types and endpoint parameter models. Enable the experimental `typeref` compiler feature to use these references. Require a `public` default and preserve AND groups and credential alternatives.
