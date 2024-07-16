---
jsApi: true
title: "[F] getClientNamespaceString"

---
```ts
function getClientNamespaceString(context): string | undefined
```

Get the client's namespace for generation. If package-name is passed in config, we return
that value as our namespace. Otherwise, we default to the TypeSpec service namespace.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `context` | `TCGCContext` |  |

## Returns

`string` \| `undefined`
