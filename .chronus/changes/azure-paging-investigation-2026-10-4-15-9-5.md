---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-azure-rulesets"
---

Add the `continuation-token-response` linter rule and enable it in the `data-plane` ruleset. It warns when a `@list` operation has a request `@continuationToken` but no response `@continuationToken`, including responses that page using `@nextLink`.