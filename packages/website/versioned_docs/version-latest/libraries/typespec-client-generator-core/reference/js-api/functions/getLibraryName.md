---
jsApi: true
title: "[F] getLibraryName"

---
```ts
getLibraryName(context, type): string
```

Get the library name of a property / parameter / operation / model / enum. Takes projections into account

Returns name in the following order of priority
1. language emitter name, i.e. @projectedName("csharp", "csharpSpecificName") => "csharpSpecificName"
2. client name, i.e. @projectedName("client", "clientName") => "clientName"
3. friendly name, i.e. @friendlyName("friendlyName") => "friendlyName"
4. name in typespec

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | [`SdkContext`](../interfaces/SdkContext.md)<`Record`<`string`, `any`\>\> |  |
| `type` | `Model` \| `ModelProperty` \| `Operation` |  |

## Returns

`string`

the library name for a typespec type
