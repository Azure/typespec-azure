---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend `arm-resource-operation-response` to require an ARM PUT request body and reuse of one registered ARM resource model across the request and 200/201 response bodies, without adding a separately configured rule.

Ignore bodyless response variants, including explicit `void` bodies, when checking the remaining resource responses.

Treat singleton status ranges as their exact response code when comparing resource bodies.
