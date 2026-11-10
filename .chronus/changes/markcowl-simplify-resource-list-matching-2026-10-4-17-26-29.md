---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `resolveArmResources` list association: match exact parent collections for all resources, subscription collections only for resource-group-scoped tracked resources, and explicit resource names across scopes. Attach matching lists to every eligible identity and retain unmatched lists in `providerOperations` without creating resources.
