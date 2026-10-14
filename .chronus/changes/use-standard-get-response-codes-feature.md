---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `use-standard-get-response-codes` lint rule to check that ARM GET operations include a `200` response and use only allowed additional response codes.

Numeric statuses and singleton ranges are equivalent; broad ranges remain disallowed.
