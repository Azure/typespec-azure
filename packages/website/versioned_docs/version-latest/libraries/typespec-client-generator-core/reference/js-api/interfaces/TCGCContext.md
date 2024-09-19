---
jsApi: true
title: "[I] TCGCContext"

---
## Extended by

- [`SdkContext`](SdkContext.md)

## Properties

| Property | Type |
| ------ | ------ |
| `__clientToApiVersionClientDefaultValue` | `Map`<`Namespace` \| `Interface`, `undefined` \| `string`\> |
| `__clientToParameters` | `Map`<`Namespace` \| `Interface`, [`SdkParameter`](../type-aliases/SdkParameter.md)[]\> |
| `__httpOperationExamples?` | `Map`<`HttpOperation`, [`SdkHttpOperationExample`](SdkHttpOperationExample.md)[]\> |
| `__rawClients?` | [`SdkClient`](SdkClient.md)[] |
| `__service_projection?` | `Map`<`Namespace`, [`Namespace`, `undefined` \| `ProjectedProgram`]\> |
| `__tspTypeToApiVersions` | `Map`<`Type`, `string`[]\> |
| `apiVersion?` | `string` |
| `arm?` | `boolean` |
| `decoratorsAllowList?` | `string`[] |
| `diagnostics` | readonly `Diagnostic`[] |
| `emitterName` | `string` |
| `examplesDir?` | `string` |
| `filterOutCoreModels?` | `boolean` |
| `flattenUnionAsEnum?` | `boolean` |
| `generateConvenienceMethods?` | `boolean` |
| `generateProtocolMethods?` | `boolean` |
| `generatedNames?` | `Map`<`Model` \| `Union` \| `TspLiteralType`, `string`\> |
| `httpOperationCache?` | `Map`<`Operation`, `HttpOperation`\> |
| `knownScalars?` | `Record`<`string`, [`SdkBuiltInKinds`](../type-aliases/SdkBuiltInKinds.md)\> |
| `modelsMap?` | `Map`<`Type`, [`SdkModelType`](SdkModelType.md) \| [`SdkEnumType`](SdkEnumType.md)\> |
| `originalProgram` | `Program` |
| `packageName?` | `string` |
| `previewStringRegex` | `RegExp` |
| `program` | `Program` |
| `unionsMap?` | `Map`<`Union`, [`SdkUnionType`](SdkUnionType.md)<[`SdkType`](../type-aliases/SdkType.md)\>\> |
