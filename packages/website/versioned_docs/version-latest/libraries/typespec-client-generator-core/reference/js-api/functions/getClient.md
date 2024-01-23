---
jsApi: true
title: "[F] getClient"

---
```ts
getClient(context, type): SdkClient | undefined
```

Return the client object for the given namespace or interface, or undefined if the given namespace or interface is not a client.

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | [`SdkContext`](../interfaces/SdkContext.md)<`Record`<`string`, `any`\>\> | SdkContext |
| `type` | `Interface` \| `Namespace` | Type to check |

## Returns

[`SdkClient`](../interfaces/SdkClient.md) \| `undefined`

Client or undefined
