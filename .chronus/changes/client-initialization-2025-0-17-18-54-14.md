---
changeKind: deprecation
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Deprecate `SdkClientAccessor` type. Use `parent` and `children` property from `SdkClientType` to find client hierarchy instead.