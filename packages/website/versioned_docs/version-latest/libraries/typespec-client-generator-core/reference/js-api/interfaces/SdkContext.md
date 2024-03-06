---
jsApi: true
title: "[I] SdkContext"

---
## Extends

- `TCGCContext`

## Type parameters

| Type parameter | Value |
| :------ | :------ |
| `TOptions` extends `object` | `Record`<`string`, `any`\> |

## Properties

| Property | Type | Inherited from |
| :------ | :------ | :------ |
| `arm?` | `boolean` | `TCGCContext.arm` |
| `emitContext` | `EmitContext`<`TOptions`\> | - |
| `emitterName` | `string` | `TCGCContext.emitterName` |
| `filterOutCoreModels?` | `boolean` | `TCGCContext.filterOutCoreModels` |
| `generateConvenienceMethods?` | `boolean` | `TCGCContext.generateConvenienceMethods` |
| `generateProtocolMethods?` | `boolean` | `TCGCContext.generateProtocolMethods` |
| `generatedNames?` | `Set`<`string`\> | `TCGCContext.generatedNames` |
| `knownScalars?` | `Record`<`string`, [`SdkBuiltInKinds`](../type-aliases/SdkBuiltInKinds.md)\> | `TCGCContext.knownScalars` |
| `modelsMap?` | `Map`<`Type`, [`SdkModelType`](SdkModelType.md) \| [`SdkEnumType`](SdkEnumType.md)\> | `TCGCContext.modelsMap` |
| `operationModelsMap?` | `Map`<`Operation`, `Map`<`Type`, [`SdkModelType`](SdkModelType.md) \| [`SdkEnumType`](SdkEnumType.md)\>\> | `TCGCContext.operationModelsMap` |
| `packageName?` | `string` | `TCGCContext.packageName` |
| `program` | `Program` | `TCGCContext.program` |
