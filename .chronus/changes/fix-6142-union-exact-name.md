---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Preserve `isExactName` on `SdkUnionType` and `SdkNullableType` when union client names use `exact()` with `@clientName`.
