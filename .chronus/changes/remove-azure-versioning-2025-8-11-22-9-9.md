---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

Remove versioning

```diff lang=tsp
-@useDependency(Azure.Core.Versions.v1_preview2)
```
