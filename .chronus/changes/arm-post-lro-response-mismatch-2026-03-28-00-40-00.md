---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add linter rule `arm-post-lro-response-mismatch` to warn when a long-running POST operation's final result type does not match the 200 response body
