---
jsApi: true
title: "[F] $singleton"

---
```ts
function $singleton(
   context, 
   target, 
   keyValue?): void
```

This decorator is used to mark a resource type as a "singleton", a type with
only one instance.  The standard set of resource operations can be applied to
such a resource type, they will generate the correct routes and parameter
lists.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | `DecoratorContext` |
| `target` | `Model` |
| `keyValue`? | `string` |

## Returns

`void`
