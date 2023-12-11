---
jsApi: true
title: "[F] isInternal"

---
```ts
isInternal(context, entity): boolean
```

Whether a model / operation is internal or not. If it's internal, emitters
should not expose them to users

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | [`SdkContext`](../interfaces/SdkContext.md)<`Record`<`string`, `any`\>\> | SdkContext |
| `entity` | `Model` \| `Enum` \| `Operation` \| `Union` | model / operation that we want to check is internal or not |

## Returns

`boolean`

whether the entity is internal

## Deprecated

This function is unused and will be removed in a future release.
