---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Identify `list-response-envelope` operations through `resolveArmResources` and each resource's list operations instead of URL paths or paging decorators. Skip unassociated operations and validate inherited envelope properties.
