---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix `reorderParameters`, `addParameter`, `removeParameter`, and `replaceParameter` so that decorators copied to cloned model properties and cloned operations are applied (by calling `finishType` after cloning). This fixes scenarios such as parameters with `@typeChangedFrom` under a `@versioned` service.
