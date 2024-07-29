---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

The baseType will be undefined if the `SdkBuiltInType`, `SdkDateTimeType`, `SdkDurationType` is a std type
