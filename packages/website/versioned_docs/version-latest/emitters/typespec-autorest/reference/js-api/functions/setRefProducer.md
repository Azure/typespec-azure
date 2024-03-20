---
jsApi: true
title: "[F] setRefProducer"

---
```ts
setRefProducer(
   program, 
   entity, 
   refProducer): void
```

Configures a "ref producer" for the given entity.  A ref producer is a
function that returns a ref path for the given entity, possibly altered by
the options provided to the function (like the service and version).

## Parameters

| Parameter | Type |
| :------ | :------ |
| `program` | `Program` |
| `entity` | `Model` \| `ModelProperty` |
| `refProducer` | [`RefProducer`](../type-aliases/RefProducer.md) |

## Returns

`void`
