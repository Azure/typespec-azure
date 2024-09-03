---
jsApi: true
title: "[F] getSdkModelWithDiagnostics"

---
```ts
function getSdkModelWithDiagnostics(
   context, 
   type, 
   operation?): [SdkModelType, readonly Diagnostic[]]
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | [`TCGCContext`](../interfaces/TCGCContext.md) |
| `type` | `Model` |
| `operation`? | `Operation` |

## Returns

[[`SdkModelType`](../interfaces/SdkModelType.md), readonly `Diagnostic`[]]
