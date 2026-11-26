---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Combine the resource DELETE, PUT, and POST response checks into `use-standard-response-codes`, reporting at most one diagnostic per operation. Default error responses are left to `missing-error-response` rather than required by the combined rule. The ARM library's `all` ruleset disables the three older rules, which remain available for explicit configuration. Update suppressions for the old rule IDs to the combined rule ID.
