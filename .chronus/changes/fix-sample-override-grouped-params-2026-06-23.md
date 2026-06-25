---
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

Fix sample generation to respect `@@override` parameter grouping. Grouped query/header parameters are now nested under their wrapper method parameter (e.g. `queryOptions`) instead of being emitted flat on the options object.
