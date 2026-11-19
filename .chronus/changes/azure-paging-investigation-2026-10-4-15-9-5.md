---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-azure-resource-manager"
---

Add a focused `list-response-envelope` warning for `@list` operations with a request `@continuationToken` but no response `@continuationToken`, including responses using `@nextLink`. Paired tokens remain allowed, and inherited operations are reported only once. The opt-in ARM rule includes the same warning alongside its existing envelope checks.