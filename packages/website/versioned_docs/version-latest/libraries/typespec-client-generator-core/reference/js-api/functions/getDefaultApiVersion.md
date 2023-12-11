---
jsApi: true
title: "[F] getDefaultApiVersion"

---
```ts
getDefaultApiVersion(context, serviceNamespace): Version | undefined
```

Return the default api version for a versioned service. Will return undefined if one does not exist

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | [`SdkContext`](../interfaces/SdkContext.md)<`Record`<`string`, `any`\>\> | - |
| `serviceNamespace` | `Namespace` |  |

## Returns

`Version` \| `undefined`
