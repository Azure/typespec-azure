---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add `no-redundant-operation-group-name` to warn when a common SDK method name repeats its owning operation group name. Renaming a shipped SDK method can break callers.
