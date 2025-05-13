---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `ErrorAdditionalInfo.info` in common types by changing its type from `{}` to `Record<unknown>`.
