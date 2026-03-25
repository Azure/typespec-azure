---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add experimental extern functions for operation transformations:
- `replaceParameter`: Replace a parameter in an operation
- `removeParameter`: Remove a parameter from an operation
- `addParameter`: Add a new parameter to an operation
- `reorderParameters`: Reorder parameters of an operation according to a specified order

These functions enable composable transformations that work with `@@override` to customize method signatures in client SDKs.