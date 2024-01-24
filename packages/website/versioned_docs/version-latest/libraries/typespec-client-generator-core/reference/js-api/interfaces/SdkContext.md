---
jsApi: true
title: "[I] SdkContext"

---
## Type parameters

| Parameter | Value |
| :------ | :------ |
| `TOptions` extends `object` | `Record`<`string`, `any`\> |

## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `arm?` | `boolean` | - |
| `emitContext` | `EmitContext`<`TOptions`\> | - |
| `emitterName` | `string` | - |
| `filterOutCoreModels?` | `boolean` | - |
| `generateConvenienceMethods` | `boolean` | - |
| `generateProtocolMethods` | `boolean` | - |
| `generatedNames?` | `Set`<`string`\> | - |
| `modelsMap?` | `Map`<`Type`, [`SdkModelType`](SdkModelType.md) \| [`SdkEnumType`](SdkEnumType.md)\> | - |
| `operationModelsMap?` | `Map`<`Operation`, `Map`<`Type`, [`SdkModelType`](SdkModelType.md) \| [`SdkEnumType`](SdkEnumType.md)\>\> | - |
| `packageName?` | `string` | - |
| `program` | `Program` | - |
