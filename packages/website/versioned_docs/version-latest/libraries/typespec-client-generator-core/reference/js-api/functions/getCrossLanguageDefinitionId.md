---
jsApi: true
title: "[F] getCrossLanguageDefinitionId"

---
```ts
function getCrossLanguageDefinitionId(
   context, 
   type, 
   operation?, 
   appendNamespace?): string
```

Helper function to return cross language definition id for a type

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `context` | [`TCGCContext`](../interfaces/TCGCContext.md) | `undefined` | - |
| `type` | \| `Namespace` \| `Enum` \| `Interface` \| `Model` \| `ModelProperty` \| `Operation` \| `Scalar` \| `Union` | `undefined` |  |
| `operation`? | `Operation` | `undefined` | - |
| `appendNamespace`? | `boolean` | `true` | - |

## Returns

`string`
