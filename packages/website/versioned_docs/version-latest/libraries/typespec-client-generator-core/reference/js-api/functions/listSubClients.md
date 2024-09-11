---
jsApi: true
title: "[F] listSubClients"

---
```ts
function listSubClients<TServiceOperation>(client, listNestedClients): SdkClientType<TServiceOperation>[]
```

Get all the sub clients from current client.

## Type Parameters

| Type Parameter |
| ------ |
| `TServiceOperation` *extends* [`SdkHttpOperation`](../interfaces/SdkHttpOperation.md) |

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `client` | [`SdkClientType`](../interfaces/SdkClientType.md)<`TServiceOperation`\> | `undefined` |  |
| `listNestedClients` | `boolean` | `false` | determine if nested clients should be listed |

## Returns

[`SdkClientType`](../interfaces/SdkClientType.md)<`TServiceOperation`\>[]
