---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Combine the resource DELETE, PUT, and POST response checks into `use-standard-response-codes`, reporting at most one diagnostic per operation for these checks. The combined rule does not require a default error response; that is expected to be validated by `missing-error-response` once it is available and enabled. The ARM library's `all` ruleset disables the three older rules, which remain available for explicit configuration. Update suppressions for the old rule IDs to the combined rule ID.
