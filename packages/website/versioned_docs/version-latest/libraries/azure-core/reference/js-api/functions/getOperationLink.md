---
jsApi: true
title: "[F] getOperationLink"

---
```ts
function getOperationLink(
   program, 
   entity, 
   linkType): OperationLinkMetadata | undefined
```

Returns the `OperationLinkMetadata` for a given operation and link type, or undefined.

## Parameters

| Parameter | Type |
| :------ | :------ |
| `program` | `Program` |
| `entity` | `Operation` |
| `linkType` | `string` |

## Returns

[`OperationLinkMetadata`](../interfaces/OperationLinkMetadata.md) \| `undefined`
