---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add `ArmListBySubscriptionScope` operation template for listing resources at the subscription scope with a flat path, useful for child resources that need a subscription-level list operation without parent path segments.
