---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Fix `ErrorAdditionalInfo.info` in common types by changing its type from `{}` to `unknown`.
