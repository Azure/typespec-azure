---
jsApi: true
title: "[T] RefProducer"

---
```ts
type RefProducer: (program, entity, params) => string | undefined;
```

A function that can produce a ref path at the time it is requested.

## Parameters

| Parameter | Type |
| :------ | :------ |
| `program` | `Program` |
| `entity` | `Model` \| `ModelProperty` |
| `params` | [`RefProducerParams`](../interfaces/RefProducerParams.md) |

## Returns

`string` \| `undefined`
