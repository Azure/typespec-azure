---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add new `arm-version-progression` linter rule that validates ARM service versions are declared in strictly increasing chronological order, with preview versions appearing before the stable version for the same date.
