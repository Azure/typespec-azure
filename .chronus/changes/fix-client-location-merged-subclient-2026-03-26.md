---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fixed `@clientLocation` operations being lost when targeting a sub client that gets merged in multi-service `autoMergeService` scenarios
