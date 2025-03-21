---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Do not add encode for bytes according to content type if it has user defined encode.