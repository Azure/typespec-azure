---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

when tcgc creates a content type when not defined in tsp, we want to set it as optional