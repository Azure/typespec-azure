---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Support `exact()` in `@clientLocation` string targets to preserve operation group casing in generated clients. Exact and ordinary references to the same group share a single client.
