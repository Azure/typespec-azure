---
jsApi: true
title: "[F] getSdkTypeBaseHelper"

---
```ts
getSdkTypeBaseHelper<TKind>(
   context, 
   type, 
kind): SdkTypeBaseHelper<TKind>
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
| `type` | `string` \| `Type` |  |
| `kind` | `TKind` | - |

## Returns

`SdkTypeBaseHelper`<`TKind`\>
