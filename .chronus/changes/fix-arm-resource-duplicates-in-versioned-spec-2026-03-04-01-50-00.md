---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add regression tests confirming that `resolveArmResources` returns the correct number of resources (no duplicates) when called on a versioned spec, regardless of whether TCGC's `createSdkContext` has been called first.
