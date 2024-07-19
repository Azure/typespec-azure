---
jsApi: true
title: "[F] getPagedResult"

---
```ts
function getPagedResult(program, entity): PagedResultMetadata | undefined
```

Retrieves PagedResultMetadata for a model, if available. If passed an
operation, this will search the operations return type for any paged
response and return the PagedResultMetadata for that response.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `program` | `Program` |
| `entity` | `Model` \| `Operation` |

## Returns

[`PagedResultMetadata`](../interfaces/PagedResultMetadata.md) \| `undefined`
