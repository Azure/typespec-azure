---
changeKind: fix
packages:
  - "@azure-tools/typespec-breaking-change"
---

Preserve numeric API scalar types during HTTP canonicalization so int32-to-float64 transitions are detected and independently approved.