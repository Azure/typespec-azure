---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Consolidate list response field names and array validation in `list-response-envelope`.
Require an array-valued `value` and the standard `nextLink` field, including inherited
properties and paged list actions. Remove the separate `list-response-value-array` rule.
