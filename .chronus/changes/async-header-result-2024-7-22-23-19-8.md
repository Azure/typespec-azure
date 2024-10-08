---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix #1180 Return StatusMonitor result field for non-resource PUT operations in getLroMetadata.finalResult
