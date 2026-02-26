---
changeKind: internal
packages:
  - "@azure-tools/typespec-autorest"
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-client-generator-core"
---

Uptake changes for TypeSpec functions:

- Regenerated `generated-defs` signatures.
- Updated any exhaustive checks that are invalidated by the introduction of `FunctionValue`.
