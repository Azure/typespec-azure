---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: breaking
packages:
  - "@azure-tools/typespec-azure-core"
---

Remove legacy Azure.Core paging. The following was removed
  - `@pagedResult` decorator
  - `@items` decorator
  - [API] `getPagedResult` -> `getPagingOperation` in `@typespec/compiler`
  - [API] `getItems`
  - [API] `getNextLink`
