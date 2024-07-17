---
jsApi: true
title: "[F] getArmCommonTypesVersion"

---
```ts
function getArmCommonTypesVersion(program, entity): string | undefined
```

Returns the ARM common-types version used by the service.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `program` | `Program` | - |
| `entity` | `Namespace` \| `EnumMember` | Target of the decorator. Must be `Namespace` or `EnumMember` type |

## Returns

`string` \| `undefined`
