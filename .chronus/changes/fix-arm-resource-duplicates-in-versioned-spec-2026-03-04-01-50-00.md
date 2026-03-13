---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `resolveArmResources` returning duplicate resources for versioned specs. ARM resources that are in a mutation realm (created by versioning projections from TCGC's `createSdkContext` or the autorest emitter's per-version snapshots) are now filtered out from `listArmResources`. This prevents duplicates in the resource list while keeping realm types registered so that direct lookups (e.g., `getArmResourceInfo`) continue to work correctly.
