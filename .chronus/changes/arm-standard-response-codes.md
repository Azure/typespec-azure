---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Combine the existing resource DELETE, PUT, and POST response checks into `use-standard-response-codes` without changing their validation behavior. The ARM library's `all` ruleset disables the three older rules, which remain available for explicit configuration. Update suppressions for the old rule IDs to the combined rule ID.
