---
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

Preserve `$DO_NOT_NORMALIZE$` operation-group names in classical client generation to avoid double-normalization that caused unresolved placeholder references.
