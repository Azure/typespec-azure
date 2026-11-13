---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Honor scoped `@clientName` overrides on source types when resolving `@friendlyName` templates, including ARM list-result and PATCH request model names.
