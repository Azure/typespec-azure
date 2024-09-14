---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

1. change `encode` in `SdkBuiltInType` to optional.
2. no longer use the value of `kind` as `encode` when there is no encode on this type.
