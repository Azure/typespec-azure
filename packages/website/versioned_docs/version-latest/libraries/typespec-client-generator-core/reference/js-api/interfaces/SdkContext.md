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
| `TServiceOperation` extends [`SdkServiceOperation`](../type-aliases/SdkServiceOperation.md) | [`SdkHttpOperation`](SdkHttpOperation.md) |

## Properties

| Property | Type | Inherited from |
| :------ | :------ | :------ |
| `__api_version_client_default_value?` | `string` | `TCGCContext.__api_version_client_default_value` |
| `__api_version_parameter?` | [`SdkParameter`](../type-aliases/SdkParameter.md) | `TCGCContext.__api_version_parameter` |
| `__api_versions?` | `string`[] | `TCGCContext.__api_versions` |
| `__clients?` | [`SdkClientType`](SdkClientType.md)<`TServiceOperation`\>[] | - |
| `arm?` | `boolean` | `TCGCContext.arm` |
| `emitContext` | `EmitContext`<`TOptions`\> | - |
| `emitterName` | `string` | `TCGCContext.emitterName` |
| `experimental_sdkPackage` | [`SdkPackage`](SdkPackage.md)<`TServiceOperation`\> | - |
| `filterOutCoreModels?` | `boolean` | `TCGCContext.filterOutCoreModels` |
| `flattenUnionAsEnum?` | `boolean` | `TCGCContext.flattenUnionAsEnum` |
| `generateConvenienceMethods?` | `boolean` | `TCGCContext.generateConvenienceMethods` |
| `generateProtocolMethods?` | `boolean` | `TCGCContext.generateProtocolMethods` |
| `generatedNames?` | `Map`<`Model` \| `Union`, `string`\> | `TCGCContext.generatedNames` |
| `httpOperationCache?` | `Map`<`Operation`, `HttpOperation`\> | `TCGCContext.httpOperationCache` |
| `knownScalars?` | `Record`<`string`, [`SdkBuiltInKinds`](../type-aliases/SdkBuiltInKinds.md)\> | `TCGCContext.knownScalars` |
| `modelsMap?` | `Map`<`Type`, [`SdkEnumType`](SdkEnumType.md) \| [`SdkModelType`](SdkModelType.md)\> | `TCGCContext.modelsMap` |
| `operationModelsMap?` | `Map`<`Operation`, `Map`<`Type`, [`SdkEnumType`](SdkEnumType.md) \| [`SdkModelType`](SdkModelType.md)\>\> | `TCGCContext.operationModelsMap` |
| `packageName?` | `string` | `TCGCContext.packageName` |
| `program` | `Program` | `TCGCContext.program` |
| `unionsMap?` | `Map`<`Union`, [`SdkUnionType`](SdkUnionType.md)\> | `TCGCContext.unionsMap` |
