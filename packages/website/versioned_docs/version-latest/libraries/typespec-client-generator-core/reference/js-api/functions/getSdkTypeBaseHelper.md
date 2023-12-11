---
jsApi: true
title: "[F] getSdkTypeBaseHelper"

---
```ts
getSdkTypeBaseHelper<TKind>(
   context, 
   type, 
kind): DefaultSdkTypeBase<TKind>
```

Helper function to return default values for nullable, encode etc

## Type parameters

| Parameter |
| :------ |
| `TKind` |

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | [`SdkContext`](../interfaces/SdkContext.md)<`Record`<`string`, `any`\>\> | - |
| `type` | `Type` |  |
| `kind` | `TKind` | - |

## Returns

`DefaultSdkTypeBase`<`TKind`\>
