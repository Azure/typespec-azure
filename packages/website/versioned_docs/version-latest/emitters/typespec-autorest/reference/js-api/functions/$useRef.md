---
jsApi: true
title: "[F] $useRef"

---
```ts
$useRef(
   context, 
   entity, 
   jsonRef): void
```

`@useRef` - is used to replace the TypeSpec model type in emitter output with a pre-existing named OpenAPI schema such as ARM common types.

## Parameters

| Parameter | Type |
| :------ | :------ |
| `context` | `DecoratorContext` |
| `entity` | `Model` \| `ModelProperty` |
| `jsonRef` | `string` |

## Returns

`void`
