---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix namespace duplication when `@clientNamespace` extends the namespace flag (e.g. `@clientNamespace("Azure.Search.Documents.Indexes")` with namespace flag `Azure.Search.Documents`)
