---
jsApi: true
title: "[F] getOperationGroup"

---
```ts
getOperationGroup(context, type): SdkOperationGroup | undefined
```

Return the operation group object for the given namespace or interface or undefined is not an operation group.

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | [`SdkContext`](../interfaces/SdkContext.md)<`Record`<`string`, `any`\>\> | SdkContext |
| `type` | `Interface` \| `Namespace` | Type to check |

## Returns

[`SdkOperationGroup`](../interfaces/SdkOperationGroup.md) \| `undefined`

Operation group or undefined.
