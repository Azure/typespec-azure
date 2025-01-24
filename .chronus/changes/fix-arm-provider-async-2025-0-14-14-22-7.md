---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `ArmProviderActionSync` and `ArmProviderActionAsync` not generating the correct namespace provider when the scope wasn't present
