---
jsApi: true
title: "[F] getClientNamespaceString"

---
```ts
getClientNamespaceString(context): string | undefined
```

Get the client's namespace for generation. If package-name is passed in config, we return
that value as our namespace. Otherwise, we default to the TypeSpec service namespace.

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | [`SdkContext`](../interfaces/SdkContext.md)<`Record`<`string`, `any`\>\> |  |

## Returns

`string` \| `undefined`
