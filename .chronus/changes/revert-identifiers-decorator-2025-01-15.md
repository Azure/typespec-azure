---
changeKind: deprecation
packages:
  - "@azure-tools/typespec-autorest"
  - "@azure-tools/typespec-azure-resource-manager"
---

Deprecated automatic x-ms-identifiers generation from @key decorator and removed the @identifiers decorator. Use @OpenAPI.extension("x-ms-identifiers", ...) to specify identifiers explicitly when needed.
