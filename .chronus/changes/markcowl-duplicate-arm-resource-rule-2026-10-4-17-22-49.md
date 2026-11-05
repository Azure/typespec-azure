---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `no-resource-instance-duplicates` to warn when `resolveArmResources` returns distinct records with the same case-insensitive resource type and instance path, retaining path parameter names. Register the rule disabled in the central `resource-manager` ruleset pending fixes to existing service specifications; it is available through explicit enablement or the ARM library's `all` ruleset.