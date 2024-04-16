---
jsApi: true
title: "[F] createSdkContext"

---
```ts
createSdkContext<TOptions, TServiceOperation>(context, emitterName?): SdkContext<TOptions, TServiceOperation>
```

## Type parameters

| Type parameter | Value |
| :------ | :------ |
| `TOptions` extends `Record`<`string`, `any`\> | [`SdkEmitterOptions`](../interfaces/SdkEmitterOptions.md) |
| `TServiceOperation` extends [`SdkHttpOperation`](../interfaces/SdkHttpOperation.md) | [`SdkHttpOperation`](../interfaces/SdkHttpOperation.md) |

## Parameters

| Parameter | Type |
| :------ | :------ |
| `context` | `EmitContext`<`TOptions`\> |
| `emitterName`? | `string` |

## Returns

[`SdkContext`](../interfaces/SdkContext.md)<`TOptions`, `TServiceOperation`\>
