---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `arm-resour-operation` rule to not stop for `ArmProviderActionAsync` and ArmProviderActionSync` operations as they are not resource operations 