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
| `__clients?` | [`SdkClientType`](SdkClientType.md)<`TServiceOperation`\>[] | - |
| `__namespaceToApiVersionClientDefaultValue` | `Map`<`Interface` \| `Namespace`, `undefined` \| `string`\> | `TCGCContext.__namespaceToApiVersionClientDefaultValue` |
| `__namespaceToApiVersionParameter` | `Map`<`Interface` \| `Namespace`, [`SdkParameter`](../type-aliases/SdkParameter.md)\> | `TCGCContext.__namespaceToApiVersionParameter` |
| `__namespaceToApiVersions` | `Map`<`Interface` \| `Namespace`, `string`[]\> | `TCGCContext.__namespaceToApiVersions` |
| `__rawClients?` | [`SdkClient`](SdkClient.md)[] | `TCGCContext.__rawClients` |
| `__service_projection?` | `Map`<`Namespace`, [`Namespace`, `undefined` \| `ProjectedProgram`]\> | `TCGCContext.__service_projection` |
| `__subscriptionIdParameter?` | [`SdkParameter`](../type-aliases/SdkParameter.md) | `TCGCContext.__subscriptionIdParameter` |
| `apiVersion?` | `string` | `TCGCContext.apiVersion` |
| `arm?` | `boolean` | `TCGCContext.arm` |
| `diagnostics` | readonly `Diagnostic`[] | `TCGCContext.diagnostics` |
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
| `originalProgram` | `Program` | `TCGCContext.originalProgram` |
| `packageName?` | `string` | `TCGCContext.packageName` |
| `program` | `Program` | `TCGCContext.program` |
| `unionsMap?` | `Map`<`Union`, [`SdkUnionType`](SdkUnionType.md)\> | `TCGCContext.unionsMap` |
