---
jsApi: true
title: "[F] listOperationsInOperationGroup"

---
```ts
listOperationsInOperationGroup(context, group): Operation[]
```

List operation in the given operation group. Pass a client to list the operation at the root of the client.

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | [`SdkContext`](../interfaces/SdkContext.md)<`Record`<`string`, `any`\>\> | - |
| `group` | [`SdkClient`](../interfaces/SdkClient.md) \| [`SdkOperationGroup`](../interfaces/SdkOperationGroup.md) |  |

## Returns

`Operation`[]
