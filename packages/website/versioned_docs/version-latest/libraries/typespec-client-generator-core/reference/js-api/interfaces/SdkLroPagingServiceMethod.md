---
jsApi: true
title: "[I] SdkLroPagingServiceMethod"

---
## Extends

- `SdkServiceMethodBase`<`TServiceOperation`\>.`SdkLroServiceMethodOptions`.`SdkPagingServiceMethodOptions`

## Type Parameters

| Type Parameter |
| ------ |
| `TServiceOperation` *extends* [`SdkServiceOperation`](../type-aliases/SdkServiceOperation.md) |

## Properties

| Property | Type | Description | Inherited from |
| ------ | ------ | ------ | ------ |
| `__raw?` | `Operation` | - | `SdkServiceMethodBase.__raw` |
| ~~`__raw_lro_metadata`~~ | `LroMetadata` | **Deprecated** This property will be removed in future releases. Use `lroMetadata` for synthesized LRO metadata. If you still want to access primitive LRO info, use `lroMetadata.__raw`. | `SdkLroServiceMethodOptions.__raw_lro_metadata` |
| `__raw_paged_metadata` | `PagedResultMetadata` | - | `SdkPagingServiceMethodOptions.__raw_paged_metadata` |
| `access` | [`AccessFlags`](../type-aliases/AccessFlags.md) | - | `SdkServiceMethodBase.access` |
| `apiVersions` | `string`[] | - | `SdkServiceMethodBase.apiVersions` |
| `crossLanguageDefintionId` | `string` | - | `SdkServiceMethodBase.crossLanguageDefintionId` |
| `decorators` | [`DecoratorInfo`](DecoratorInfo.md)[] | - | `SdkServiceMethodBase.decorators` |
| `doc?` | `string` | - | `SdkServiceMethodBase.doc` |
| `exception?` | [`SdkMethodResponse`](SdkMethodResponse.md) | - | `SdkServiceMethodBase.exception` |
| `generateConvenient` | `boolean` | - | `SdkServiceMethodBase.generateConvenient` |
| `generateProtocol` | `boolean` | - | `SdkServiceMethodBase.generateProtocol` |
| `kind` | `"lropaging"` | - | - |
| `lroMetadata` | [`SdkLroServiceMetadata`](SdkLroServiceMetadata.md) | - | `SdkLroServiceMethodOptions.lroMetadata` |
| `name` | `string` | - | `SdkServiceMethodBase.name` |
| `nextLinkOperation?` | [`SdkHttpOperation`](SdkHttpOperation.md) | - | `SdkPagingServiceMethodOptions.nextLinkOperation` |
| `nextLinkPath?` | `string` | - | `SdkPagingServiceMethodOptions.nextLinkPath` |
| `operation` | `TServiceOperation` | - | `SdkServiceMethodBase.operation` |
| `parameters` | [`SdkMethodParameter`](SdkMethodParameter.md)[] | - | `SdkServiceMethodBase.parameters` |
| `response` | [`SdkMethodResponse`](SdkMethodResponse.md) | - | `SdkServiceMethodBase.response` |
| `summary?` | `string` | - | `SdkServiceMethodBase.summary` |
