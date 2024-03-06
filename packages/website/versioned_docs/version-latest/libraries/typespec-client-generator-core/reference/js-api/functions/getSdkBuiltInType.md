---
jsApi: true
title: "[F] getSdkBuiltInType"

---
```ts
getSdkBuiltInType(context, type): SdkBuiltInType
```

Get the sdk built in type for a given typespec type

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | `TCGCContext` | the sdk context |
| `type` |  \| `StringLiteral` \| `NumericLiteral` \| `BooleanLiteral` \| `Scalar` \| `IntrinsicType` | the typespec type |

## Returns

[`SdkBuiltInType`](../interfaces/SdkBuiltInType.md)

the corresponding sdk type
