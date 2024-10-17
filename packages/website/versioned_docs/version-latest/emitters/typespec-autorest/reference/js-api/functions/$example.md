---
jsApi: true
title: "[F] $example"

---
```ts
function $example(
   context, 
   target, 
   pathOrUri, 
   title): void
```

`@example` - attaches example files to an operation. Multiple examples can be specified.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `context` | `DecoratorContext` | - |
| `target` | `Operation` | - |
| `pathOrUri` | `string` | path or Uri to the example file. |
| `title` | `string` | name or description of the example file. `@example` can be specified on Operations. |

## Returns

`void`
