---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/typespec-azure-rulesets"
---

Re-enable the `no-unnamed-types` linter rule. It was rewritten to walk the TypeSpec type graph directly (starting from the client surface) instead of running the full client generation pass, which resolves the previous performance regression. The rule now favors performance over completeness, so some anonymous types may no longer be reported.
