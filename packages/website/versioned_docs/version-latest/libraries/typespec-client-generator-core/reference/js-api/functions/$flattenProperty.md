---
jsApi: true
title: "[F] $flattenProperty"

---
```ts
$flattenProperty(
   context, 
   target, 
   scope?): void
```

Whether a model property should be flattened.

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | `DecoratorContext` | DecoratorContext |
| `target` | `ModelProperty` | ModelProperty to mark as flattened |
| `scope`? | `string` | Names of the projection (e.g. "python", "csharp", "java", "javascript") |

## Returns

`void`

## Deprecated

This decorator is not recommended to use.
