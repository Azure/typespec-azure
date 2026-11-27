---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Combine the DELETE, PUT, and POST response checks into `use-standard-response-codes`, reporting at most one diagnostic per operation for these checks. All checks, including the general status-code allowlist, now apply to every operation inside a service namespace, including unregistered resource operations; operations outside services, such as SDK customizations, are no longer checked. The combined rule does not require a default error response; use `missing-error-response` for that. Ruleset defaults are unchanged: `use-standard-response-codes` remains disabled in the resource-manager ruleset and the three older rules remain enabled.
