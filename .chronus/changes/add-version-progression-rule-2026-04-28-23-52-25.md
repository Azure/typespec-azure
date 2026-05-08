---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add new `version-progression` linter rule that validates ARM service versions all use unique dates and are declared in strictly increasing chronological order. Two api-versions sharing the same `YYYY-MM-DD` date (for example, `2026-04-28` and `2026-04-28-preview`) are not allowed.
