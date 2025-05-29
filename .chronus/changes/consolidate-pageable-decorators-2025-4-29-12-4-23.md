---
changeKind: feature
packages:
  - "@azure-tools/azure-http-specs"
  - "@azure-tools/typespec-autorest"
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-client-generator-core"
---

Consolidated pageable decorators by removing `@Azure.Core.items` and `@Azure.Core.pagedResult`. Use `@TypeSpec.pageItems` and `@TypeSpec.list` instead.
