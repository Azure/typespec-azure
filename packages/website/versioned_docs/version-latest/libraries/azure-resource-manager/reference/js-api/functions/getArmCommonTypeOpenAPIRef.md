---
jsApi: true
title: "[F] getArmCommonTypeOpenAPIRef"

---
```ts
function getArmCommonTypeOpenAPIRef(
   program, 
   entity, 
   params): string | undefined
```

Get the common-types.json ref for the given common type.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `program` | `Program` |
| `entity` | `Enum` \| `Model` \| `ModelProperty` \| `Union` |
| `params` | [`ArmCommonTypesResolutionOptions`](../interfaces/ArmCommonTypesResolutionOptions.md) |

## Returns

`string` \| `undefined`
