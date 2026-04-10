---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix readonly property usage propagation: properly strip Input flag from combined usage values for readonly properties, and fix ignoreSubTypeStack imbalance when skipping readonly properties.
