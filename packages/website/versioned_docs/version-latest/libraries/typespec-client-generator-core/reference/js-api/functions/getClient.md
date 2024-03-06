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
| `context` | `TCGCContext` | TCGCContext |
| `type` | `Interface` \| `Namespace` | Type to check |

## Returns

[`SdkClient`](../interfaces/SdkClient.md) \| `undefined`

Client or undefined
