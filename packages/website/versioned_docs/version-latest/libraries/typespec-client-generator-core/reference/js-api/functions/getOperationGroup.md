---
jsApi: true
title: "[F] getOperationGroup"

---
```ts
function getOperationGroup(context, type): SdkOperationGroup | undefined
```

Return the operation group object for the given namespace or interface or undefined is not an operation group.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `context` | `TCGCContext` | TCGCContext |
| `type` | `Namespace` \| `Interface` | Type to check |

## Returns

[`SdkOperationGroup`](../interfaces/SdkOperationGroup.md) \| `undefined`

Operation group or undefined.
