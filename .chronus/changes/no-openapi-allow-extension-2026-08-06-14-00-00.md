---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

The `no-openapi` rule no longer flags the `@extension` decorator. Client-altering `x-ms-*` extensions emitted through `@extension` are handled by the `no-openapi-client-extensions` rule instead.
