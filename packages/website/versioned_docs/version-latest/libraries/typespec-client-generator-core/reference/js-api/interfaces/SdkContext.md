---
jsApi: true
title: "[I] SdkContext"

---
## Extends

- [`TCGCContext`](TCGCContext.md)

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TOptions` *extends* `object` | `Record`<`string`, `any`\> |
| `TServiceOperation` *extends* [`SdkServiceOperation`](../type-aliases/SdkServiceOperation.md) | [`SdkHttpOperation`](SdkHttpOperation.md) |

## Properties

| Property | Type | Inherited from |
| ------ | ------ | ------ |
| `__httpOperationExamples?` | `Map`<`HttpOperation`, [`SdkHttpOperationExample`](SdkHttpOperationExample.md)[]\> | [`TCGCContext`](TCGCContext.md).`__httpOperationExamples` |
| `__namespaceToApiVersionClientDefaultValue` | `Map`<`Namespace` \| `Interface`, `undefined` \| `string`\> | [`TCGCContext`](TCGCContext.md).`__namespaceToApiVersionClientDefaultValue` |
| `__namespaceToApiVersionParameter` | `Map`<`Namespace` \| `Interface`, [`SdkParameter`](../type-aliases/SdkParameter.md)\> | [`TCGCContext`](TCGCContext.md).`__namespaceToApiVersionParameter` |
| `__rawClients?` | [`SdkClient`](SdkClient.md)[] | [`TCGCContext`](TCGCContext.md).`__rawClients` |
| `__service_projection?` | `Map`<`Namespace`, [`Namespace`, `undefined` \| `ProjectedProgram`]\> | [`TCGCContext`](TCGCContext.md).`__service_projection` |
| `__subscriptionIdParameter?` | [`SdkParameter`](../type-aliases/SdkParameter.md) | [`TCGCContext`](TCGCContext.md).`__subscriptionIdParameter` |
| `__tspTypeToApiVersions` | `Map`<`Type`, `string`[]\> | [`TCGCContext`](TCGCContext.md).`__tspTypeToApiVersions` |
| `apiVersion?` | `string` | [`TCGCContext`](TCGCContext.md).`apiVersion` |
| `arm?` | `boolean` | [`TCGCContext`](TCGCContext.md).`arm` |
| `decoratorsAllowList?` | `string`[] | [`TCGCContext`](TCGCContext.md).`decoratorsAllowList` |
| `diagnostics` | readonly `Diagnostic`[] | [`TCGCContext`](TCGCContext.md).`diagnostics` |
| `emitContext` | `EmitContext`<`TOptions`\> | - |
| `emitterName` | `string` | [`TCGCContext`](TCGCContext.md).`emitterName` |
| `examplesDirectory?` | `string` | [`TCGCContext`](TCGCContext.md).`examplesDirectory` |
| `filterOutCoreModels?` | `boolean` | [`TCGCContext`](TCGCContext.md).`filterOutCoreModels` |
| `flattenUnionAsEnum?` | `boolean` | [`TCGCContext`](TCGCContext.md).`flattenUnionAsEnum` |
| `generateConvenienceMethods?` | `boolean` | [`TCGCContext`](TCGCContext.md).`generateConvenienceMethods` |
| `generateProtocolMethods?` | `boolean` | [`TCGCContext`](TCGCContext.md).`generateProtocolMethods` |
| `generatedNames?` | `Map`<`Model` \| `Union` \| `TspLiteralType`, `string`\> | [`TCGCContext`](TCGCContext.md).`generatedNames` |
| `httpOperationCache?` | `Map`<`Operation`, `HttpOperation`\> | [`TCGCContext`](TCGCContext.md).`httpOperationCache` |
| `knownScalars?` | `Record`<`string`, [`SdkBuiltInKinds`](../type-aliases/SdkBuiltInKinds.md)\> | [`TCGCContext`](TCGCContext.md).`knownScalars` |
| `modelsMap?` | `Map`<`Type`, [`SdkEnumType`](SdkEnumType.md) \| [`SdkModelType`](SdkModelType.md)\> | [`TCGCContext`](TCGCContext.md).`modelsMap` |
| `operationModelsMap?` | `Map`<`Operation`, `Map`<`Type`, [`SdkEnumType`](SdkEnumType.md) \| [`SdkModelType`](SdkModelType.md)\>\> | [`TCGCContext`](TCGCContext.md).`operationModelsMap` |
| `originalProgram` | `Program` | [`TCGCContext`](TCGCContext.md).`originalProgram` |
| `packageName?` | `string` | [`TCGCContext`](TCGCContext.md).`packageName` |
| `previewStringRegex` | `RegExp` | [`TCGCContext`](TCGCContext.md).`previewStringRegex` |
| `program` | `Program` | [`TCGCContext`](TCGCContext.md).`program` |
| `sdkPackage` | [`SdkPackage`](SdkPackage.md)<`TServiceOperation`\> | - |
| `spreadModels?` | `Map`<`Model`, [`SdkModelType`](SdkModelType.md)\> | [`TCGCContext`](TCGCContext.md).`spreadModels` |
| `unionsMap?` | `Map`<`Union`, [`SdkUnionType`](SdkUnionType.md)\> | [`TCGCContext`](TCGCContext.md).`unionsMap` |
