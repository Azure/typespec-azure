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
2. introduce `SdkScalarType`. Now types defined by keyword `scalar` will be parsed as a `SdkScalarType` with specific name and namespace.
