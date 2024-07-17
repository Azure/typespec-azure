---
jsApi: true
title: "[F] addFormatInfo"

---
```ts
function addFormatInfo(
   context, 
   type, 
   propertyType): void
```

Add format info onto an sdk type. Since the format decorator
decorates the ModelProperty, we add the format info onto the property's internal
type.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `context` | `TCGCContext` | sdk context |
| `type` | `ModelProperty` \| `Scalar` | the original typespec type. Used to grab the format decorator off of |
| `propertyType` | [`SdkType`](../type-aliases/SdkType.md) | the type of the property, i.e. the internal type that we add the format info onto |

## Returns

`void`
