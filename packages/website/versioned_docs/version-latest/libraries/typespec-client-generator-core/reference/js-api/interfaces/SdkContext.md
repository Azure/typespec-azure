---
jsApi: true
title: "[I] SdkContext"

---
## Extends

- `TCGCContext`

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TOptions` *extends* `object` | `Record`<`string`, `any`\> |
| `TServiceOperation` *extends* [`SdkServiceOperation`](../type-aliases/SdkServiceOperation.md) | [`SdkHttpOperation`](SdkHttpOperation.md) |

## Properties

| Property | Type | Inherited from |
| ------ | ------ | ------ |
| `__namespaceToApiVersionClientDefaultValue` | `Map`<`Namespace` \| `Interface`, `undefined` \| `string`\> | `TCGCContext.__namespaceToApiVersionClientDefaultValue` |
| `__namespaceToApiVersionParameter` | `Map`<`Namespace` \| `Interface`, [`SdkParameter`](../type-aliases/SdkParameter.md)\> | `TCGCContext.__namespaceToApiVersionParameter` |
| `__rawClients?` | [`SdkClient`](SdkClient.md)[] | `TCGCContext.__rawClients` |
| `__service_projection?` | `Map`<`Namespace`, [`Namespace`, `undefined` \| `ProjectedProgram`]\> | `TCGCContext.__service_projection` |
| `__subscriptionIdParameter?` | [`SdkParameter`](../type-aliases/SdkParameter.md) | `TCGCContext.__subscriptionIdParameter` |
| `__tspTypeToApiVersions` | `Map`<`Type`, `string`[]\> | `TCGCContext.__tspTypeToApiVersions` |
| `apiVersion?` | `string` | `TCGCContext.apiVersion` |
| `arm?` | `boolean` | `TCGCContext.arm` |
| `decoratorsAllowList?` | `string`[] | `TCGCContext.decoratorsAllowList` |
| `diagnostics` | readonly `Diagnostic`[] | `TCGCContext.diagnostics` |
| `emitContext` | `EmitContext`<`TOptions`\> | - |
| `emitterName` | `string` | `TCGCContext.emitterName` |
| `filterOutCoreModels?` | `boolean` | `TCGCContext.filterOutCoreModels` |
| `flattenUnionAsEnum?` | `boolean` | `TCGCContext.flattenUnionAsEnum` |
| `generateConvenienceMethods?` | `boolean` | `TCGCContext.generateConvenienceMethods` |
| `generateProtocolMethods?` | `boolean` | `TCGCContext.generateProtocolMethods` |
| `generatedNames?` | `Map`<`Model` \| `Union` \| `TspLiteralType`, `string`\> | `TCGCContext.generatedNames` |
| `httpOperationCache?` | `Map`<`Operation`, `HttpOperation`\> | `TCGCContext.httpOperationCache` |
| `knownScalars?` | `Record`<`string`, [`SdkBuiltInKinds`](../type-aliases/SdkBuiltInKinds.md)\> | `TCGCContext.knownScalars` |
| `modelsMap?` | `Map`<`Type`, [`SdkEnumType`](SdkEnumType.md) \| [`SdkModelType`](SdkModelType.md)\> | `TCGCContext.modelsMap` |
| `operationModelsMap?` | `Map`<`Operation`, `Map`<`Type`, [`SdkEnumType`](SdkEnumType.md) \| [`SdkModelType`](SdkModelType.md)\>\> | `TCGCContext.operationModelsMap` |
| `originalProgram` | `Program` | `TCGCContext.originalProgram` |
| `packageName?` | `string` | `TCGCContext.packageName` |
| `previewStringRegex` | `RegExp` | `TCGCContext.previewStringRegex` |
| `program` | `Program` | `TCGCContext.program` |
| `sdkPackage` | [`SdkPackage`](SdkPackage.md)<`TServiceOperation`\> | - |
| `spreadModels?` | `Map`<`Model`, [`SdkModelType`](SdkModelType.md)\> | `TCGCContext.spreadModels` |
| `unionsMap?` | `Map`<`Union`, [`SdkUnionType`](SdkUnionType.md)\> | `TCGCContext.unionsMap` |
