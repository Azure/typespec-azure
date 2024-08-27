---
jsApi: true
title: "[F] getResultModelWithProperty"

---
```ts
function getResultModelWithProperty(
   program, 
   operation, 
   predicate): [Model, ModelProperty] | undefined
```

Return the first response model that has any properties matching the given model property predicate

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `program` | `Program` | The program being processed |
| `operation` | `Operation` | The operation to retrieve matching response from |
| `predicate` | (`prop`) => `boolean` | The predicate function to apply to each model property of the responses |

## Returns

[`Model`, `ModelProperty`] \| `undefined`

The model and matching model property, or nothing if no matching models are found
