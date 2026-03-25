---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/typespec-autorest"
---

Fix `getLroMetadata` to correctly handle scalar types (e.g., `string`) as LRO final results. Previously, scalar result types in status monitor `@lroResult` properties were not recognized, causing incorrect metadata.

