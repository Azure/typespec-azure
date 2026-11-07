---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend `no-reserved-resource-property` to reject `systemData` in ARM resource properties bags, keeping system metadata in the resource envelope. This covers the direct resource-bag restriction from `SystemDataInPropertiesBag` and applies wherever the existing rule is enabled, including the recommended resource-manager ruleset.
