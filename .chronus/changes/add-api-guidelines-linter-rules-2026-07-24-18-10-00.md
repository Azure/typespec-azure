---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `no-dollar-prefixed-query-params` linter rule, which reports data-plane query parameters whose wire name is a `$`-prefixed spelling of a standard collection query option such as `$filter` or `$top`.