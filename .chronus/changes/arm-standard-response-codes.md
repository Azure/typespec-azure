---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Combine the DELETE, PUT, and POST response checks into `use-standard-response-codes`, reporting at most one diagnostic per operation for these checks. Like the GET check, they apply to every operation with that verb inside a service namespace, not only registered resource operations; operations outside services keep the general allowlist. The combined rule does not require a default error response; use `missing-error-response` for that. Ruleset defaults are unchanged: `use-standard-response-codes` remains disabled in the resource-manager ruleset and the three older rules remain enabled.
