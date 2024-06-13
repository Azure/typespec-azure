---
jsApi: true
title: "[F] createSdkContext"

---
```ts
function createSdkContext<TOptions, TServiceOperation>(
   context, 
   emitterName?, 
options?): SdkContext<TOptions, TServiceOperation>
```

## Type parameters

| Type parameter | Value |
| :------ | :------ |
| `TOptions` *extends* `Record`<`string`, `any`\> | [`SdkEmitterOptions`](../interfaces/SdkEmitterOptions.md) |
| `TServiceOperation` *extends* [`SdkHttpOperation`](../interfaces/SdkHttpOperation.md) | [`SdkHttpOperation`](../interfaces/SdkHttpOperation.md) |

## Parameters

| Parameter | Type |
| :------ | :------ |
| `context` | `EmitContext`<`TOptions`\> |
| `emitterName`? | `string` |
| `options`? | `CreateSdkContextOptions` |

## Returns

[`SdkContext`](../interfaces/SdkContext.md)<`TOptions`, `TServiceOperation`\>
