---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `no-repeated-path-info` lint rule to warn when ARM PUT resource properties repeat path or query parameter names.

This complements `arm-resource-duplicate-property`, which checks duplication of resource envelope property names rather than URI parameter names.
