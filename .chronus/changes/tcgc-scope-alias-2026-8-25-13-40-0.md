---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Introduce a shared `Azure.ClientGenerator.Core.Scope` alias for the `scope` argument used by scoped decorators. This can be referenced from user TypeSpec and library code, and centralizes the type so it can evolve consistently across all scoped decorators.
