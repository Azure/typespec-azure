---
jsApi: true
title: "[F] $useFinalStateVia"

---
```ts
function $useFinalStateVia(
   context, 
   entity, 
   finalState): void
```

overrides the final state for an lro

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `context` | `DecoratorContext` | The execution context for the decorator |
| `entity` | `Operation` | The decorated operation |
| `finalState` | `string` | The desired value for final-state-via |

## Returns

`void`
