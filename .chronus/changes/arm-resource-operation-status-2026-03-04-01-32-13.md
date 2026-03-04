---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add `ArmResourceOperationStatus` model (without `@path` on `id` property) and scope-specific model templates `ArmTenantResourceOperationStatus` and `ArmSubscriptionResourceOperationStatus`. Also add operation templates `ArmResourceGetTenantOperationStatus` and `ArmResourceGetSubscriptionOperationStatus` for getting operation status at tenant and subscription scopes.
