---
jsApi: true
title: "[F] $armCommonTypesVersion"

---
```ts
function $armCommonTypesVersion(
   context, 
   entity, 
   version): void
```

`@armCommonTypesVersion` sets the ARM common-types version used by the service.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `context` | `DecoratorContext` | DecoratorContext object |
| `entity` | `Namespace` \| `EnumMember` | Target of the decorator. Must be `Namespace` or `EnumMember` type |
| `version` | `string` \| `EnumValue` | - |

## Returns

`void`
