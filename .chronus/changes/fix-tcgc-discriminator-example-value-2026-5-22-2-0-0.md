---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix example values being dropped on subtypes added via `@hierarchyBuilding` by propagating serialization options from the nearest ancestor to the newly added subtype
