---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Add an autorest emitter warning when multiple operations resolve to the same OpenAPI `operationId`, and report the warning on each conflicting operation.
