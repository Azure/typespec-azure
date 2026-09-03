---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add an ARM lint rule that warns when point GET, PUT, PATCH, or DELETE operations declare query parameters other than `api-version`.
