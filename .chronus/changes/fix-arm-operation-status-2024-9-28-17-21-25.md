---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix the `ArmOperationStatus` model to match the Azure-AsyncOperation Resource format, where the `id` is of type `string` instead of `Core.uuid`.
