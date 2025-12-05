---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix issues in `resolveArmResources` when we have singleton resource with a customized name
