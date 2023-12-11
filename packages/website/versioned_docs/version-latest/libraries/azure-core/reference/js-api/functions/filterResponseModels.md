---
jsApi: true
title: "[F] filterResponseModels"

---
```ts
filterResponseModels(operation, predicate): Model[] | undefined
```

Filter operation responses using a predicate

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `operation` | `HttpOperation` | The operation containign the response models to filter |
| `predicate` | (`model`) => `boolean` | A predicate function to apply to each response model |

## Returns

`Model`[] \| `undefined`

A list of models matching the predicate, or undefined if there are none
