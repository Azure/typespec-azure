---
jsApi: true
title: "[F] getAsEmbeddingVector"

---
```ts
function getAsEmbeddingVector(program, model): EmbeddingVectorMetadata | undefined
```

If the provided model is an embedding vector, returns the appropriate metadata; otherwise,
returns undefined.

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `program` | `Program` | - |
| `model` | `Model` | the model to query |

## Returns

[`EmbeddingVectorMetadata`](../interfaces/EmbeddingVectorMetadata.md) \| `undefined`

`EmbeddingVectorMetadata`, if applicable, or undefined.
