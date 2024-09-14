---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

1. The kind for `unknown` renamed from `any` to `unknown`.
2. The `values` property in `SdkUnionType` renamed to `variantTypes`.
3. The `values` property in `SdkTupleType` renamed to `valueTypes`.
4. The example types for parameter, response and `SdkType` has been renamed to `XXXExampleValue` to emphasize that they are values instead of the example itself.
5. The `@format` decorator is no longer able to change the type of the property. 
