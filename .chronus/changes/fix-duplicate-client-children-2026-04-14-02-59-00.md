---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix duplicate client entries returned by `getClients()` and `getRootClients()` when multi-service sub-clients are merged via `autoMergeService`.
