---
jsApi: true
title: "[F] getSdkUnionEnumWithDiagnostics"

---
```ts
function getSdkUnionEnumWithDiagnostics(
   context, 
   type, 
   operation?): [SdkEnumType, readonly Diagnostic[]]
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | [`TCGCContext`](../interfaces/TCGCContext.md) |
| `type` | `UnionEnum` |
| `operation`? | `Operation` |

## Returns

[[`SdkEnumType`](../interfaces/SdkEnumType.md), readonly `Diagnostic`[]]
