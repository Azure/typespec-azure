---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Update of arm no-response-body to have a similar behavior of the core rule, but with the difference that it will exclude also 202 response, meaning that 202 should also be empty.
