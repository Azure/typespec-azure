---
jsApi: true
title: "[F] listOperationsInOperationGroup"

---
```ts
function listOperationsInOperationGroup(
   context, 
   group, 
   ignoreHierarchy): Operation[]
```

List operations inside a client or an operation group. If ignoreHierarchy is true, the result will include all nested operations.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `context` | `TCGCContext` | `undefined` | - |
| `group` | [`SdkClient`](../interfaces/SdkClient.md) \| [`SdkOperationGroup`](../interfaces/SdkOperationGroup.md) | `undefined` | Client or operation group to list operations |
| `ignoreHierarchy` | `boolean` | `false` | Whether to get all nested operations |

## Returns

`Operation`[]
