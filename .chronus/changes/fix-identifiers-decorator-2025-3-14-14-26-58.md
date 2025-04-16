---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
  - "@azure-tools/typespec-azure-resource-manager"
---

Fixing gaps in the `@identifiers` decorator functionality:
- The `@identifier` decorator should take priority when present, and its value should be respected.
- The value of the `@identifier` decorator is determined by the `ModelProperty`, not the array type.
- The `@armProviderNamespace` is correctly identified in both scenarios: when applied to the array type or the model property.
