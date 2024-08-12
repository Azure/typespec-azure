---
jsApi: true
title: "[I] TCGCContext"

---
## Extended by

- [`SdkContext`](SdkContext.md)

## Properties

| Property | Type |
| ------ | ------ |
| `__httpOperationExamples?` | `Map`<`HttpOperation`, [`SdkHttpOperationExample`](SdkHttpOperationExample.md)[]\> |
| `__namespaceToApiVersionClientDefaultValue` | `Map`<`Namespace` \| `Interface`, `undefined` \| `string`\> |
| `__namespaceToApiVersionParameter` | `Map`<`Namespace` \| `Interface`, [`SdkParameter`](../type-aliases/SdkParameter.md)\> |
| `__rawClients?` | [`SdkClient`](SdkClient.md)[] |
| `__service_projection?` | `Map`<`Namespace`, [`Namespace`, `undefined` \| `ProjectedProgram`]\> |
| `__subscriptionIdParameter?` | [`SdkParameter`](../type-aliases/SdkParameter.md) |
| `__tspTypeToApiVersions` | `Map`<`Type`, `string`[]\> |
| `apiVersion?` | `string` |
| `arm?` | `boolean` |
| `decoratorsAllowList?` | `string`[] |
| `diagnostics` | readonly `Diagnostic`[] |
| `emitterName` | `string` |
| `examplesDirectory?` | `string` |
| `filterOutCoreModels?` | `boolean` |
| `flattenUnionAsEnum?` | `boolean` |
| `generateConvenienceMethods?` | `boolean` |
| `generateProtocolMethods?` | `boolean` |
| `generatedNames?` | `Map`<`Model` \| `Union` \| `TspLiteralType`, `string`\> |
| `httpOperationCache?` | `Map`<`Operation`, `HttpOperation`\> |
| `knownScalars?` | `Record`<`string`, [`SdkBuiltInKinds`](../type-aliases/SdkBuiltInKinds.md)\> |
| `modelsMap?` | `Map`<`Type`, [`SdkEnumType`](SdkEnumType.md) \| [`SdkModelType`](SdkModelType.md)\> |
| `operationModelsMap?` | `Map`<`Operation`, `Map`<`Type`, [`SdkEnumType`](SdkEnumType.md) \| [`SdkModelType`](SdkModelType.md)\>\> |
| `originalProgram` | `Program` |
| `packageName?` | `string` |
| `previewStringRegex` | `RegExp` |
| `program` | `Program` |
| `spreadModels?` | `Map`<`Model`, [`SdkModelType`](SdkModelType.md)\> |
| `unionsMap?` | `Map`<`Union`, [`SdkUnionType`](SdkUnionType.md)\> |
