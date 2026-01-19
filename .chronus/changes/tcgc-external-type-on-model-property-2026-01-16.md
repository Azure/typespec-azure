---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add warning when `@alternateType` decorator with external type information is applied to model properties. External types should be applied to the type definition itself (Scalar, Model, Enum, or Union) instead of model properties.
