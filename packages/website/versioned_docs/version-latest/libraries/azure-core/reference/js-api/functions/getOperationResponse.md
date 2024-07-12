---
jsApi: true
title: "[F] getOperationResponse"

---
```ts
function getOperationResponse(program, operation): Model | undefined
```

Get the main success response from an operation

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `program` | `Program` | Get success responses for an operation |
| `operation` | `Operation` | The operation to process |

## Returns

`Model` \| `undefined`

A model, if there is a 2xx response, or nothing otherwise
