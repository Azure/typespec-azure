---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Allow protocol-required bodyless HEAD errors while still requiring an error response. Keep standard error bodies required for other HTTP methods.
