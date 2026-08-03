---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-azure-rulesets"
  - "@azure-tools/typespec-client-generator-core"
---

Replace the `no-unnamed-union` linter rule with `no-unnamed-types` in `@azure-tools/typespec-azure-core`. The new rule flags anonymous models in addition to unnamed unions, walking the type graph from operations to detect anonymous models on the client surface. The `no-unnamed-types` rule has been removed from `@azure-tools/typespec-client-generator-core`.
