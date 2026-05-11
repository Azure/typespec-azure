---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add new linter rule `arm-no-path-casing-conflicts` that flags ARM operation paths which differ only by character casing. The rule is enabled in the `@azure-tools/typespec-azure-rulesets` resource-manager ruleset.
