---
jsApi: true
title: "[F] $armProviderNamespace"

---
```ts
function $armProviderNamespace(
   context, 
   entity, 
   armProviderNamespace?): void
```

`@armProviderNamespace` sets the ARM provider namespace.

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | `DecoratorContext` | DecoratorContext object |
| `entity` | `Namespace` | Target of the decorator. Must be `namespace` type |
| `armProviderNamespace`? | `string` | Provider namespace |

## Returns

`void`
