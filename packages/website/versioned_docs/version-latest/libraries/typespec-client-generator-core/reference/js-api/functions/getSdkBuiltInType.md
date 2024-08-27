---
jsApi: true
title: "[F] getSdkBuiltInType"

---
```ts
function getSdkBuiltInType(context, type): SdkDateTimeType | SdkDurationType | SdkBuiltInType
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | [`TCGCContext`](../interfaces/TCGCContext.md) |
| `type` | \| `BooleanLiteral` \| `IntrinsicType` \| `NumericLiteral` \| `Scalar` \| `StringLiteral` |

## Returns

[`SdkDateTimeType`](../type-aliases/SdkDateTimeType.md) \| [`SdkDurationType`](../interfaces/SdkDurationType.md) \| [`SdkBuiltInType`](../interfaces/SdkBuiltInType.md)
