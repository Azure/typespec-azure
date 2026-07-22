---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Surface `@encode(string)` on boolean types in `SdkBuiltInType` so downstream emitters can generate string-encoded boolean (de)serialization.
