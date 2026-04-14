---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Remove the type constraint on the `Properties` parameter in `Azure.ResourceManager.Legacy.GenericResource`, allowing `unknown` and `Record<unknown>` as property types.
