---
jsApi: true
title: "[F] filterModelProperties"

---
```ts
filterModelProperties(model, predicate): ModelProperty[]
```

Filter the model properties of a model, using the given predicate

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `model` | `Model` | The model to filter |
| `predicate` | (`prop`) => `boolean` | - |

## Returns

`ModelProperty`[]

a list of filtered properties, it will have length 0 if no properties
match the filter.

## Parm

predicate The predicate function used to filter model properties
