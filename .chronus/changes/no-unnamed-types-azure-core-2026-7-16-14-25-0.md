---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-azure-rulesets"
---

Replace the `no-unnamed-union` linter rule with `no-unnamed-types` in `@azure-tools/typespec-azure-core`. The new rule flags anonymous models in addition to unnamed unions, walking the type graph from operations to detect anonymous types on the client surface. The TCGC `no-unnamed-types` rule is disabled in rulesets in favor of this rule.
