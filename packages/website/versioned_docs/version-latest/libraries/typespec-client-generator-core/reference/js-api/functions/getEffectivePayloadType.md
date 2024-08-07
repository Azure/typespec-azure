---
jsApi: true
title: "[F] getEffectivePayloadType"

---
```ts
function getEffectivePayloadType(context, type): Model
```

If the given type is an anonymous model and all of its properties excluding
header/query/path/status-code are sourced from a named model, returns that original named model.
Otherwise the given type is returned unchanged.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `context` | [`TCGCContext`](../interfaces/TCGCContext.md) |  |
| `type` | `Model` |  |

## Returns

`Model`
