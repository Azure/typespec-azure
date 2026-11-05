---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `no-resource-instance-duplicates` to warn when `resolveArmResources` returns distinct records with the same case-insensitive resource type and instance path, retaining path parameter names. Enable the rule in the `resource-manager` ruleset.