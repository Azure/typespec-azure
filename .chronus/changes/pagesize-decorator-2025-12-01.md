---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

Add pagination decorators to query parameter models: `@pageSize` to `MaxPageSizeQueryParameter.maxpagesize` and `@offset` to `SkipQueryParameter.skip`
