---
jsApi: true
title: "[F] getLroMetadata"

---
```ts
function getLroMetadata(program, operation): LroMetadata | undefined
```

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `program` | `Program` | The program being processed |
| `operation` | `Operation` | The operation to get Lwo Metadata for |

## Returns

[`LroMetadata`](../interfaces/LroMetadata.md) \| `undefined`

LroMetadata for the operation is it is long-running,
or nothing if the operation is synchronous, or lro information
cannot be processed.
