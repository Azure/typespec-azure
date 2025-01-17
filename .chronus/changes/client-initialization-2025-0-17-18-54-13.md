---
changeKind: deprecation
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Deprecate `initialization` property of `SdkClientType`. Use `init.paramters` of `SdkClientType` instead. Use `parent` and `children` property from `SdkClientType` to find client hierarchy instead.