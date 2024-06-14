---
jsApi: true
title: "[F] isArmVirtualResource"

---
```ts
function isArmVirtualResource(program, target): boolean
```

Determine if the given model is an external resource.

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `program` | `Program` | The program to process. |
| `target` | `Model` | The model to check. |

## Returns

`boolean`

true if the model or any model it extends is marked as a resource, otherwise false.
