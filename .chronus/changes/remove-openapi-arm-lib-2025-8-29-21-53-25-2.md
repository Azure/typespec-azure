---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
---

Remove exception for `no-openapi` rule for using `x-ms-identifiers`. Migrating to `@identifiers` is required.
