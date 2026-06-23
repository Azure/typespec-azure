---
changeKind: breaking
packages:
  - "@azure-tools/typespec-ts"
---

Remove the internal `source-from` emitter option. Generation always targets TypeSpec sources, so the option and all Swagger-specific generation branches it gated have been removed.
