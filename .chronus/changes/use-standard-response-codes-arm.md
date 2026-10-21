---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `use-standard-response-codes` ARM lint rule combining the Swagger `NoErrorCodeResponses` and `GetResponseCodes` checks. Concrete HTTP endpoints may only use `200`, `201`, `202`, `204`, and `default`, including operations without service or provider namespace metadata. GET operations inside services must include `200` and may only add `202` or `default`, with one warning per invalid GET operation.
