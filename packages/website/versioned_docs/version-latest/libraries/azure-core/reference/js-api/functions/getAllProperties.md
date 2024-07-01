---
jsApi: true
title: "[F] getAllProperties"

---
```ts
function getAllProperties(model, collection?): Map<string, ModelProperty>
```

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `model` | `Model` | The model to process |
| `collection`? | `Map`<`string`, `ModelProperty`\> | The set of ModelProperties found so far |

## Returns

`Map`<`string`, `ModelProperty`\>

The full set of model properties found in a model and all ancestors
