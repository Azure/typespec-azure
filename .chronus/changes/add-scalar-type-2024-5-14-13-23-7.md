---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

## Changes

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
3. add `name`, `crossLanguageDefinitionId` and `baseType` to `SdkBuiltInType`, `SdkDateTimeType` and `SdkDurationType`.
4. now scalars defined using `scalar` keyword will be parsed into either `SdkBuiltInType`, `SdkDateTimeType` or `SdkDurationType` depending on the base type, with its `name` and `crossLanguageDefinitionId`. `@encode` will be added to the scalar type, and will not propagate to its base type.
5. `isSdkFloatKind` now returns `false` for `decimal` and `decimal128`.

## Migration guides for emitters

The major breaking change introduced by this change is the removal of azure related kinds for `SdkBuiltInType`. Therefore for code such as:
```typescript
if (type.kind === "azureLocation")
{
  // do something for azure-location
}
```
should be changed to the following if the emitter is doing something special for azure-location:
```typescript
if (type.kind === "string" && type.crossLanguageDefinitionId === "Azure.Core.azureLocation")
{
  // do something for azure-location
}
```
or just change it to this:
```typescript
if (type.kind === "string")
{
  // treat azure-location as a string
}
```

For those removed kinds, they no longer exist therefore it should be safe just remove related code snippets.
