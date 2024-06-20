---
jsApi: true
title: "[F] getSuccessResponse"

---
```ts
function getSuccessResponse(program, operation): Model | undefined
```

Get the first success response of an operation

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `program` | `Program` | The program being processed |
| `operation` | `HttpOperation` | The operation to process |

## Returns

`Model` \| `undefined`

The first success response, or nothing, if no matching models are found
