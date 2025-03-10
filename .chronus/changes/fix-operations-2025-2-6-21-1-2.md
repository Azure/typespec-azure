---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `ArmProviderActionAsync` and `ArmProviderActionSync` operations as both operations were returning `ErrorResponse` and not accepting changes to the error response type.
