---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `resolveArmResources` returning duplicate resources when called after TCGC's `createSdkContext` on a versioned spec. ARM resources that are in a mutation realm (created by versioning projections) are now skipped during registration to prevent duplicates in the resource state map.
