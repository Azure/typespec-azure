---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add new linter rule `arm-no-path-casing-conflicts` that flags ARM operation paths which differ only by character casing. Includes an auto-fix that lowercases conflicting `@segment("...")` decorator values when the difference is solely in segment string literals.
