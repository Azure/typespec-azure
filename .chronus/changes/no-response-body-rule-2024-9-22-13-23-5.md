---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Update the `arm no-response-body` rule to behave similarly to the core rule, but with the additional requirement that the 202 response can and should also be empty
