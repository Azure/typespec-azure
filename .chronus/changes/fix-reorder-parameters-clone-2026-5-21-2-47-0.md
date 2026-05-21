---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix crash in `reorderParameters` (and other parameter-modifying functions) when an operation parameter has decorators like `@typeChangedFrom` that rely on the parameter's parent model. Cloning now uses `tk.type.clone` so all type fields are preserved.
