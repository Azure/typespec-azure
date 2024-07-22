---
jsApi: true
title: "[F] getLroErrorResult"

---
```ts
function getLroErrorResult(
   program, 
   entity, 
   useDefault): [ModelProperty | undefined, readonly Diagnostic[]]
```

Gets the error result property from a StatusMonitor

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `program` | `Program` | `undefined` | The program to process. |
| `entity` | `Model` | `undefined` | The StatusMonitor model to process. |
| `useDefault` | `boolean` | `true` | Use the default error property if no other property is marked. (defaults to true) |

## Returns

[`ModelProperty` \| `undefined`, readonly `Diagnostic`[]]
