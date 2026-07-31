---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `visibility-sealed` errors reported for the resource `name` property when emitters or versioning re-apply the ARM resource decorators on a copy of the resource type
