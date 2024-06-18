---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

1. remove the following types from `SdkBuiltInType`:
   - `uuid` (azure type)
   - `ipV4Address` (azure type)
   - `ipV6Address` (azure type)
   - `eTag` (azure type)
   - `armId` (azure type)
   - `azureLocation` (azure type)
   - `password` (removed)
   - `guid` (removed)
   - `uri` (removed)
   - `ipAddress` (removed)
2. `@format` can no longer change a string type to above azure types (`uuid`, `eTag`, etc).
3. add `name`, `tspNamespace` and `baseType` to `SdkBuiltInType`, `SdkDatetimeType` and `SdkDurationType`.
4. now scalars defined using `scalar` keyword will be parsed into either `SdkBuiltInType`, `SdkDatetimeType` or `SdkDurationType` depending on the base type, with its name and tsp namespace. `@encode` will be added to the scalar type, and will not propagate to its base type.
