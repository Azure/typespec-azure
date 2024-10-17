---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-rulesets"
---

Disable `@azure-tools/typespec-azure-core/standard-names` for `resource-manager` ruleset. Rule was already excluding ARM operations automatically this just configure the ruleset correctly
