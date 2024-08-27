---
jsApi: true
title: "[F] getHttpMetadata"

---
```ts
function getHttpMetadata(program, operation): HttpOperation
```

Get the Http metadata for this operation

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `program` | `Program` | The program being processed |
| `operation` | `Operation` | The operation to get http metadata for |

## Returns

`HttpOperation`

An HttpOperation with http metadata.  May emit error diagnostics.
