---
jsApi: true
title: "[I] SdkLroServiceMethod"

---
## Extends

- `SdkServiceMethodBase`<`TServiceOperation`\>.`SdkLroServiceMethodOptions`

## Type Parameters

| Type Parameter |
| ------ |
| `TServiceOperation` *extends* [`SdkServiceOperation`](../type-aliases/SdkServiceOperation.md) |

## Properties

| Property | Type | Description | Inherited from |
| ------ | ------ | ------ | ------ |
| `__raw?` | `Operation` | - | `SdkServiceMethodBase.__raw` |
| `__raw_lro_metadata` | `LroMetadata` | - | `SdkLroServiceMethodOptions.__raw_lro_metadata` |
| `access` | [`AccessFlags`](../type-aliases/AccessFlags.md) | - | `SdkServiceMethodBase.access` |
| `apiVersions` | `string`[] | - | `SdkServiceMethodBase.apiVersions` |
| `crossLanguageDefintionId` | `string` | - | `SdkServiceMethodBase.crossLanguageDefintionId` |
| `decorators` | [`DecoratorInfo`](DecoratorInfo.md)[] | - | `SdkServiceMethodBase.decorators` |
| ~~`description?`~~ | `string` | **Deprecated** Use `doc` and `summary` instead. | `SdkServiceMethodBase.description` |
| ~~`details?`~~ | `string` | **Deprecated** Use `doc` and `summary` instead. | `SdkServiceMethodBase.details` |
| `doc?` | `string` | - | `SdkServiceMethodBase.doc` |
| `exception?` | [`SdkMethodResponse`](SdkMethodResponse.md) | - | `SdkServiceMethodBase.exception` |
| `generateConvenient` | `boolean` | - | `SdkServiceMethodBase.generateConvenient` |
| `generateProtocol` | `boolean` | - | `SdkServiceMethodBase.generateProtocol` |
| `kind` | `"lro"` | - | - |
| `name` | `string` | - | `SdkServiceMethodBase.name` |
| `operation` | `TServiceOperation` | - | `SdkServiceMethodBase.operation` |
| `parameters` | [`SdkMethodParameter`](SdkMethodParameter.md)[] | - | `SdkServiceMethodBase.parameters` |
| `response` | [`SdkMethodResponse`](SdkMethodResponse.md) | - | `SdkServiceMethodBase.response` |
| `summary?` | `string` | - | `SdkServiceMethodBase.summary` |
