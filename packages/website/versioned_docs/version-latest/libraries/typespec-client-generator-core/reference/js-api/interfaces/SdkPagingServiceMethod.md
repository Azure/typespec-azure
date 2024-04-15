---
jsApi: true
title: "[I] SdkPagingServiceMethod"

---
## Extends

- `SdkServiceMethodBase`<`TServiceOperation`\>.`SdkPagingServiceMethodOptions`

## Type parameters

| Type parameter |
| :------ |
| `TServiceOperation` extends [`SdkServiceOperation`](../type-aliases/SdkServiceOperation.md) |

## Properties

| Property | Type | Inherited from |
| :------ | :------ | :------ |
| `__raw?` | `Operation` | `SdkServiceMethodBase.__raw` |
| `__raw_paged_metadata` | `PagedResultMetadata` | `SdkPagingServiceMethodOptions.__raw_paged_metadata` |
| `access` | `undefined` \| [`AccessFlags`](../type-aliases/AccessFlags.md) | `SdkServiceMethodBase.access` |
| `apiVersions` | `string`[] | `SdkServiceMethodBase.apiVersions` |
| `description?` | `string` | `SdkServiceMethodBase.description` |
| `details?` | `string` | `SdkServiceMethodBase.details` |
| `exception?` | [`SdkMethodResponse`](SdkMethodResponse.md) | `SdkServiceMethodBase.exception` |
| `kind` | `"paging"` | - |
| `name` | `string` | `SdkServiceMethodBase.name` |
| `nextLinkOperation?` | [`SdkHttpOperation`](SdkHttpOperation.md) | `SdkPagingServiceMethodOptions.nextLinkOperation` |
| `nextLinkPath?` | `string` | `SdkPagingServiceMethodOptions.nextLinkPath` |
| `operation` | `TServiceOperation` | `SdkServiceMethodBase.operation` |
| `parameters` | [`SdkMethodParameter`](SdkMethodParameter.md)[] | `SdkServiceMethodBase.parameters` |
| `response` | [`SdkMethodResponse`](SdkMethodResponse.md) | `SdkServiceMethodBase.response` |

## Methods

### ~~getParameterMapping()~~

```ts
getParameterMapping(serviceParam): SdkModelPropertyType[]
```

#### Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `serviceParam` | [`SdkHttpParameter`](../type-aliases/SdkHttpParameter.md) |  |

#### Returns

[`SdkModelPropertyType`](../type-aliases/SdkModelPropertyType.md)[]

#### Inherited from

`SdkServiceMethodBase.getParameterMapping`

#### Deprecated

This property is deprecated. Access .correspondingMethodParams on the service parameters instead

***

### ~~getResponseMapping()~~

```ts
getResponseMapping(): undefined | string
```

#### Returns

`undefined` \| `string`

#### Inherited from

`SdkServiceMethodBase.getResponseMapping`

#### Deprecated

This property is deprecated. Access .resultPath on the method response instead
