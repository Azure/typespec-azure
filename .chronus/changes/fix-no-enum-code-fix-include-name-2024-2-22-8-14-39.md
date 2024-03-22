---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

`no-enum` rule codefix now convert to named variant when the enum had not values (e.g. `enum E {a, b}`)