---
jsApi: true
title: "[F] getPropertyNames"

---
```ts
getPropertyNames(context, property): [string, string]
```

Get the library and wire name of a model property. Takes projections into account

Gets library name from getLibraryName. Returns wire name in the following order of priority:
1. projected wire name i.e. @projectedName("json", "jsonSpecificName") => jsonSpecificName
2. name in typespec

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | [`SdkContext`](../interfaces/SdkContext.md)<`Record`<`string`, `any`\>\> |  |
| `property` | `ModelProperty` |  |

## Returns

[`string`, `string`]

a tuple of the library and wire name for a model property
