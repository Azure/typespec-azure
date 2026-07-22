---
changeKind: feature
packages:
  - "@azure-tools/typespec-metadata"
  - "@azure-tools/typespec-go"
---

During SDK generation, if a go.mod file exists, its module identity is used as the source of truth, including any major version suffix. This alleviates the need to update tspconfig.yaml whenver a new major version is required.