---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

Remove `Azure.Core.nextLink` as there is a nextLink instance in `TypeSpec.nextLink`, which is causing an ambiguous problem between the two.
