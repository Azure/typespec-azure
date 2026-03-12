---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Consolidate orphan type discovery into shared cached `listOrphanTypes` used by both `handleServiceOrphanTypes` and `getGeneratedName`, fixing duplicate client name errors for orphan unions and unstable enum naming with versioned services
