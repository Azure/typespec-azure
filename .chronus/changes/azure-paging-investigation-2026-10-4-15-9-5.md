---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

Add the `no-continuation-token` linter rule to warn on `@continuationToken` usage in Azure APIs, including paired request and response tokens. Prefer `@nextLink` pagination instead.