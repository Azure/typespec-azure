---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Exclude array constraints from `use-union-hierarchy` model inheritance and ownership checks while retaining the explicit `extends` requirement and compiler array element validation.
