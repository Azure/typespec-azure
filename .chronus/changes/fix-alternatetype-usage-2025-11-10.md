---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix incorrect usage flags being set on types when `@alternateType` is applied to operation parameters. When a parameter has `@alternateType`, the original type should not receive usage flags since it's being replaced by the alternate type. This fix ensures the usage value correctly reflects that the original type is not used (Usage = 0/None).
