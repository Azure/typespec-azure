---
changeKind: internal
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Introduce a shared `Azure.ClientGenerator.Core.Scope` alias for the `scope` argument used by scoped decorators, so the type can evolve consistently across the library. No behavior changes.
