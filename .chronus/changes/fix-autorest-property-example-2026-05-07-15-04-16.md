---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Emit intrinsic `@TypeSpec.example(...)` on model properties in the autorest OpenAPI2 emitter so property `example` values are preserved in generated definitions.
