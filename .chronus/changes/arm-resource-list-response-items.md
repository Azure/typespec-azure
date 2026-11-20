---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Validate resolved ARM resource operations at each resource scope and require list responses to contain a `value` array of the associated resource model.
