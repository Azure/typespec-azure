---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

Add the `continuation-token-response` linter rule to warn when a `@list` operation has a request `@continuationToken` but no response `@continuationToken`, including responses that page using `@nextLink`.