---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add `wireType` to `SdkBuiltInType` interface and populate it from the `encodedAs` parameter of `@encode` for integer, boolean, and bytes types. Previously, `wireType` was only set for datetime and duration types.
