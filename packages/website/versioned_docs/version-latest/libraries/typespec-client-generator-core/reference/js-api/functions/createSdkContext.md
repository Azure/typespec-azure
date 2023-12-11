---
jsApi: true
title: "[F] createSdkContext"

---
```ts
createSdkContext<TOptions>(context, emitterName?): SdkContext<TOptions>
```

## Type parameters

| Parameter | Default |
| :------ | :------ |
| `TOptions` extends `Record`<`string`, `any`\> | [`SdkEmitterOptions`](../interfaces/SdkEmitterOptions.md) |

## Parameters

| Parameter | Type |
| :------ | :------ |
| `context` | `EmitContext`<`TOptions`\> |
| `emitterName`? | `string` |

## Returns

[`SdkContext`](../interfaces/SdkContext.md)<`TOptions`\>
