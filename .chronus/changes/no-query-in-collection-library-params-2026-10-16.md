---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

`no-query-in-collection` now reports query parameters declared in a library, such as `Azure.Core.StandardListQueryParameters`, on the spread, intersection operand or template argument that adds them to the operation. They were silently dropped before.
