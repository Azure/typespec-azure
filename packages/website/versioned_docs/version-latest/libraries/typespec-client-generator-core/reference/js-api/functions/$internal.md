---
jsApi: true
title: "[F] $internal"

---
```ts
function $internal(
   context, 
   target, 
   scope?): void
```

Whether a operation is internal and should not be exposed
to end customers

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `context` | `DecoratorContext` | DecoratorContext |
| `target` | `Operation` | Operation to mark as internal |
| `scope`? | `string` | Names of the projection (e.g. "python", "csharp", "java", "javascript") |

## Returns

`void`

## Deprecated

Use `access` decorator instead.
