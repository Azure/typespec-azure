---
jsApi: true
title: "[F] $useRef"

---
```ts
function $useRef(
   context, 
   entity, 
   jsonRef): void
```

`@useRef` - is used to replace the TypeSpec model type in emitter output with a pre-existing named OpenAPI schema such as ARM common types.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `context` | `DecoratorContext` | - |
| `entity` | `Model` \| `ModelProperty` | - |
| `jsonRef` | `string` | path or Uri to an OpenAPI schema. `@useRef` can be specified on Models and ModelProperty. |

## Returns

`void`
