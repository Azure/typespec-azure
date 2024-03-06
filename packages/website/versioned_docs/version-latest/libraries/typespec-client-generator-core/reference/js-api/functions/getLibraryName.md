---
jsApi: true
title: "[F] getLibraryName"

---
```ts
getLibraryName(context, type): string
```

Get the library name of a property / parameter / operation / model / enum. Takes projections into account

Returns name in the following order of priority
1. language emitter name, i.e. @clientName("csharpSpecificName", "csharp") => "csharpSpecificName"
2. client name, i.e. @clientName(""clientName") => "clientName"
3. deprecated projected name
4. friendly name, i.e. @friendlyName("friendlyName") => "friendlyName"
5. name in typespec

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | `TCGCContext` |  |
| `type` | `Type` & `Object` |  |

## Returns

`string`

the library name for a typespec type
