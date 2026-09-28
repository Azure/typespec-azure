---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `use-standard-response-codes` ARM lint rule to check concrete HTTP endpoints for response statuses outside `200`, `201`, `202`, `204`, and `default`, including operations without service or provider namespace metadata.
