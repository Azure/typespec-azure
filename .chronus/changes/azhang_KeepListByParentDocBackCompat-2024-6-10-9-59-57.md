---
changeKind: breaking
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Moved `@armRenameListByOperation` into `Azure.ResourceManager.Private` namespace. Adding back original listByParent doc resolution logic to keep swagger changes to minimal.
