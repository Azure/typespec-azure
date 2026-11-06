---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add the `no-resource-name-conflict` ARM linter rule to detect duplicate logical resource names across services. Keep the rule opt-in in the Azure `resource-manager` ruleset. Document explicit resource naming for standard operations, specific extensions, legacy templates, and different scopes.
