---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Internal refactor: Begin using `effect` for modular emitter context management. This refactors `buildClientContext` to be executed within an `Effect` using a typed `Layer` for dependencies and the ts-morph project.
