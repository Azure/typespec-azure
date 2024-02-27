---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

getAllModels will return models only used as final envelope results in non-ARM definitions
