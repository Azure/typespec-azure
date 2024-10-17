---
jsApi: true
title: "[F] getSdkTupleWithDiagnostics"

---
```ts
function getSdkTupleWithDiagnostics(
   context, 
   type, 
   operation?): [SdkTupleType, readonly Diagnostic[]]
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | [`TCGCContext`](../interfaces/TCGCContext.md) |
| `type` | `Tuple` |
| `operation`? | `Operation` |

## Returns

[[`SdkTupleType`](../interfaces/SdkTupleType.md), readonly `Diagnostic`[]]
