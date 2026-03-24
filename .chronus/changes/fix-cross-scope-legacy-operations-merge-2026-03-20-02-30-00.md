---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `resolveArmResources` incorrectly merging cross-scope `LegacyOperations` into a single resource. Operations at different scopes (e.g., subscription vs tenant) with the same model but no explicit resource name are now resolved as separate resources.
