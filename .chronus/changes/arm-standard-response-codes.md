---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Combine the resource DELETE, PUT, and POST response checks into `use-standard-response-codes`, reporting at most one diagnostic per operation for these checks. The combined rule does not require a default error response; use `missing-error-response` for that. Ruleset defaults are unchanged: `use-standard-response-codes` remains disabled in the resource-manager ruleset and the three older rules remain enabled.
