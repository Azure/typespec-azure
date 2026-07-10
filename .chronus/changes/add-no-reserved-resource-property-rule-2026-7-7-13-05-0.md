---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `no-reserved-resource-property` linter rule that flags reserved property names (matched case-insensitively, e.g. `billingData`) present in an ARM resource's property bag. The reserved-name list and diagnostic reason are extensible.
