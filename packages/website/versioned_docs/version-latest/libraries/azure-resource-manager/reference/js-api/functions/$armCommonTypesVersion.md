---
jsApi: true
title: "[F] $armCommonTypesVersion"

---
```ts
$armCommonTypesVersion(
   context, 
   entity, 
   version): void
```

`@armCommonTypesVersion` sets the ARM common-types version used by the service.

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | `DecoratorContext` | DecoratorContext object |
| `entity` | `EnumMember` \| `Namespace` | Target of the decorator. Must be `Namespace` or `EnumMember` type |
| `version` | `string` \| `EnumMember` | - |

## Returns

`void`
