---
jsApi: true
title: "[F] getOperationLinks"

---
```ts
function getOperationLinks(program, entity): Map<string, OperationLinkMetadata> | undefined
```

Returns the collection of `OperationLinkMetadata` for a given operation, if any, or undefined.

## Parameters

| Parameter | Type |
| :------ | :------ |
| `program` | `Program` |
| `entity` | `Operation` |

## Returns

`Map`<`string`, [`OperationLinkMetadata`](../interfaces/OperationLinkMetadata.md)\> \| `undefined`
