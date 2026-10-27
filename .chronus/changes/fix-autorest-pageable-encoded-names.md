---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Use serialized property names for `x-ms-pageable` so paging metadata matches response schemas when `@encodedName` renames the items or next-link property.
