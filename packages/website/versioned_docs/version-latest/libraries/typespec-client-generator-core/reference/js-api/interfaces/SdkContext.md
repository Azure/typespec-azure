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
| `__clientToApiVersionClientDefaultValue` | `Map`<`Namespace` \| `Interface`, `undefined` \| `string`\> | [`TCGCContext`](TCGCContext.md).`__clientToApiVersionClientDefaultValue` |
| `__clientToParameters` | `Map`<`Namespace` \| `Interface`, [`SdkParameter`](../type-aliases/SdkParameter.md)[]\> | [`TCGCContext`](TCGCContext.md).`__clientToParameters` |
| `__httpOperationExamples?` | `Map`<`HttpOperation`, [`SdkHttpOperationExample`](SdkHttpOperationExample.md)[]\> | [`TCGCContext`](TCGCContext.md).`__httpOperationExamples` |
| `__rawClients?` | [`SdkClient`](SdkClient.md)[] | [`TCGCContext`](TCGCContext.md).`__rawClients` |
| `__service_projection?` | `Map`<`Namespace`, [`Namespace`, `undefined` \| `ProjectedProgram`]\> | [`TCGCContext`](TCGCContext.md).`__service_projection` |
| `__tspTypeToApiVersions` | `Map`<`Type`, `string`[]\> | [`TCGCContext`](TCGCContext.md).`__tspTypeToApiVersions` |
| `apiVersion?` | `string` | [`TCGCContext`](TCGCContext.md).`apiVersion` |
| `arm?` | `boolean` | [`TCGCContext`](TCGCContext.md).`arm` |
| `decoratorsAllowList?` | `string`[] | [`TCGCContext`](TCGCContext.md).`decoratorsAllowList` |
| `diagnostics` | readonly `Diagnostic`[] | [`TCGCContext`](TCGCContext.md).`diagnostics` |
| `emitContext` | `EmitContext`<`TOptions`\> | - |
| `emitterName` | `string` | [`TCGCContext`](TCGCContext.md).`emitterName` |
| `examplesDir?` | `string` | [`TCGCContext`](TCGCContext.md).`examplesDir` |
| `filterOutCoreModels?` | `boolean` | [`TCGCContext`](TCGCContext.md).`filterOutCoreModels` |
| `flattenUnionAsEnum?` | `boolean` | [`TCGCContext`](TCGCContext.md).`flattenUnionAsEnum` |
| `generateConvenienceMethods?` | `boolean` | [`TCGCContext`](TCGCContext.md).`generateConvenienceMethods` |
| `generatedNames?` | `Map`<`Model` \| `Union` \| `TspLiteralType`, `string`\> | [`TCGCContext`](TCGCContext.md).`generatedNames` |
| `generateProtocolMethods?` | `boolean` | [`TCGCContext`](TCGCContext.md).`generateProtocolMethods` |
| `httpOperationCache?` | `Map`<`Operation`, `HttpOperation`\> | [`TCGCContext`](TCGCContext.md).`httpOperationCache` |
| `knownScalars?` | `Record`<`string`, [`SdkBuiltInKinds`](../type-aliases/SdkBuiltInKinds.md)\> | [`TCGCContext`](TCGCContext.md).`knownScalars` |
| `modelsMap?` | `Map`<`Type`, [`SdkModelType`](SdkModelType.md) \| [`SdkEnumType`](SdkEnumType.md)\> | [`TCGCContext`](TCGCContext.md).`modelsMap` |
| `originalProgram` | `Program` | [`TCGCContext`](TCGCContext.md).`originalProgram` |
| `packageName?` | `string` | [`TCGCContext`](TCGCContext.md).`packageName` |
| `previewStringRegex` | `RegExp` | [`TCGCContext`](TCGCContext.md).`previewStringRegex` |
| `program` | `Program` | [`TCGCContext`](TCGCContext.md).`program` |
| `sdkPackage` | [`SdkPackage`](SdkPackage.md)<`TServiceOperation`\> | - |
| `unionsMap?` | `Map`<`Union`, [`SdkUnionType`](SdkUnionType.md)<[`SdkType`](../type-aliases/SdkType.md)\>\> | [`TCGCContext`](TCGCContext.md).`unionsMap` |
