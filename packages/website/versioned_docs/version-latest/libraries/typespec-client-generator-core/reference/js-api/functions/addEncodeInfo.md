---
jsApi: true
title: "[F] addEncodeInfo"

---
```ts
function addEncodeInfo(
   context, 
   type, 
   propertyType, 
   defaultContentType?): [void, readonly Diagnostic[]]
```

Add encoding info onto an sdk type. Since the encoding decorator
decorates the ModelProperty, we add the encoding info onto the property's internal
type.

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | `TCGCContext` | sdk context |
| `type` | `ModelProperty` \| `Scalar` | the original typespec type. Used to grab the encoding decorator off of |
| `propertyType` | [`SdkType`](../type-aliases/SdkType.md) | the type of the property, i.e. the internal type that we add the encoding info onto |
| `defaultContentType`? | `string` | - |

## Returns

[`void`, readonly `Diagnostic`[]]
