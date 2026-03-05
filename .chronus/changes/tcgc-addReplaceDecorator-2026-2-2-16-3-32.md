---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add experimental extern functions for operation transformations:
- `replaceParameter`: Replace or remove a parameter in an operation
- `replaceResponse`: Replace the return type of an operation
- `addParameter`: Add a new parameter to an operation

These functions enable composable transformations that work with `@@override` to customize method signatures in client SDKs.