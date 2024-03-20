---
jsApi: true
title: "[F] getClientFormat"

---
```ts
getClientFormat(context, entity): ClientFormat | undefined
```

Gets additional information on how to serialize / deserialize TYPESPEC standard types depending
on whether additional serialization information is provided or needed

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | `TCGCContext` | the Sdk Context |
| `entity` | `ModelProperty` | the entity whose client format we are going to get |

## Returns

[`ClientFormat`](../type-aliases/ClientFormat.md) \| `undefined`

the format in which to serialize the typespec type or undefined

## Deprecated

This function is unused and will be removed in a future release.
