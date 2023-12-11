---
jsApi: true
title: "[F] getSourceTraitName"

---
```ts
getSourceTraitName(program, property): string | undefined
```

Retrieves the `traitName` stored for the given `property`, if any.

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `program` | `Program` | Program object with context for the current compilation |
| `property` | `ModelProperty` | The model property for which the trait name should be retrieved |

## Returns

`string` \| `undefined`
