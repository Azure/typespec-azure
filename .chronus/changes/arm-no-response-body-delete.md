---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `no-response-body` to reject payloads on DELETE 200 responses and continue checking 202/204 bodies after a bodyless DELETE or POST 200 response.
