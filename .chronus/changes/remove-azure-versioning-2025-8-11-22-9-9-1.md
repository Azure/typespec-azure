---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---
Remove versioning

```diff lang=tsp
-@useDependency(Azure.ResourceManager.Versions.v1_preview2)
```
