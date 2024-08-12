---
jsApi: true
title: "[F] getFinalStateOverride"

---
```ts
function getFinalStateOverride(program, operation): FinalStateValue | undefined
```

Get the overridden final state value for this operation, if any

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `program` | `Program` | The program to process |
| `operation` | `Operation` | The operation to check for an override value |

## Returns

[`FinalStateValue`](../enumerations/FinalStateValue.md) \| `undefined`

The FInalStateValue if it exists, otherwise undefined
