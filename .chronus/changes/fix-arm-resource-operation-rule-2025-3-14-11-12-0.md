---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix the `arm-resource-operation` rule to exclude `ArmProviderActionAsync` and `ArmProviderActionSync` operations, as they are not considered resource operations.
