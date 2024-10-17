---
jsApi: true
title: "[F] getOverriddenClientMethod"

---
```ts
function getOverriddenClientMethod(context, entity): Operation | undefined
```

Gets additional information on how to serialize / deserialize TYPESPEC standard types depending
on whether additional serialization information is provided or needed

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `context` | [`TCGCContext`](../interfaces/TCGCContext.md) | the Sdk Context |
| `entity` | `Operation` | the entity whose client format we are going to get |

## Returns

`Operation` \| `undefined`

the format in which to serialize the typespec type or undefined
