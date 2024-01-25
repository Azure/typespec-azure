---
jsApi: true
title: "[F] shouldFlattenProperty"

---
```ts
shouldFlattenProperty(context, target): boolean
```

Whether a model property should be flattened or not.

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | [`SdkContext`](../interfaces/SdkContext.md)<`Record`<`string`, `any`\>\> | SdkContext |
| `target` | `ModelProperty` | ModelProperty that we want to check whether it should be flattened or not |

## Returns

`boolean`

whether the model property should be flattened or not
