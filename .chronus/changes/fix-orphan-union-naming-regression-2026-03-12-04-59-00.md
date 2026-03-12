---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix regression where orphan unions were not searched in `getGeneratedName`, causing duplicate client name errors and unstable enum naming with versioned services
