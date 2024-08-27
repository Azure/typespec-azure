---
jsApi: true
title: "[F] getSdkArrayOrDictWithDiagnostics"

---
```ts
function getSdkArrayOrDictWithDiagnostics(
   context, 
   type, 
   operation?): [SdkDictionaryType | SdkArrayType | undefined, readonly Diagnostic[]]
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | [`TCGCContext`](../interfaces/TCGCContext.md) |
| `type` | `Model` |
| `operation`? | `Operation` |

## Returns

[[`SdkDictionaryType`](../interfaces/SdkDictionaryType.md) \| [`SdkArrayType`](../interfaces/SdkArrayType.md) \| `undefined`, readonly `Diagnostic`[]]
