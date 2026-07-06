---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `no-billing-data-in-properties-bag` linter rule that flags a `BillingData` property (case-insensitive) present in an ARM resource's property bag, since the name is reserved for platform billing integration.
