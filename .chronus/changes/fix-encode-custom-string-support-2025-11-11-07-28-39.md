---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Allow custom encoding strings in `SdkDateTimeTypeBase` and `SdkDurationType` by using union type `DateTimeKnownEncoding | string` and `DurationKnownEncoding | string`.
