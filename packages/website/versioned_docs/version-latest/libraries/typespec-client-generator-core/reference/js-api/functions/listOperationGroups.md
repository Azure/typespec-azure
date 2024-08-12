---
jsApi: true
title: "[F] listOperationGroups"

---
```ts
function listOperationGroups(
   context, 
   group, 
   ignoreHierarchy): SdkOperationGroup[]
```

List all the operation groups inside a client or an operation group. If ignoreHierarchy is true, the result will include all nested operation groups.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `context` | [`TCGCContext`](../interfaces/TCGCContext.md) | `undefined` | TCGCContext |
| `group` | [`SdkClient`](../interfaces/SdkClient.md) \| [`SdkOperationGroup`](../interfaces/SdkOperationGroup.md) | `undefined` | Client or operation group to list operation groups |
| `ignoreHierarchy` | `boolean` | `false` | Whether to get all nested operation groups |

## Returns

[`SdkOperationGroup`](../interfaces/SdkOperationGroup.md)[]
