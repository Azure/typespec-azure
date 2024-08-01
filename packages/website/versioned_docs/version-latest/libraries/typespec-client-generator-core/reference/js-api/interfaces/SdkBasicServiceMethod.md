---
jsApi: true
title: "[I] SdkBasicServiceMethod"

---
## Extends

- `SdkServiceMethodBase`<`TServiceOperation`\>

## Type Parameters

| Type Parameter |
| ------ |
| `TServiceOperation` *extends* [`SdkServiceOperation`](../type-aliases/SdkServiceOperation.md) |

## Properties

| Property | Type | Inherited from |
| ------ | ------ | ------ |
| `__raw?` | `Operation` | `SdkServiceMethodBase.__raw` |
| `access` | [`AccessFlags`](../type-aliases/AccessFlags.md) | `SdkServiceMethodBase.access` |
| `apiVersions` | `string`[] | `SdkServiceMethodBase.apiVersions` |
| `crossLanguageDefintionId` | `string` | `SdkServiceMethodBase.crossLanguageDefintionId` |
| `decorators` | [`DecoratorInfo`](DecoratorInfo.md)[] | `SdkServiceMethodBase.decorators` |
| `description?` | `string` | `SdkServiceMethodBase.description` |
| `details?` | `string` | `SdkServiceMethodBase.details` |
| `exception?` | [`SdkMethodResponse`](SdkMethodResponse.md) | `SdkServiceMethodBase.exception` |
| `generateConvenient` | `boolean` | `SdkServiceMethodBase.generateConvenient` |
| `generateProtocol` | `boolean` | `SdkServiceMethodBase.generateProtocol` |
| `kind` | `"basic"` | - |
| `name` | `string` | `SdkServiceMethodBase.name` |
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
| ------ | ------ | ------ |
| `serviceParam` | [`SdkHttpParameter`](../type-aliases/SdkHttpParameter.md) |  |

#### Returns

[`SdkModelPropertyType`](../type-aliases/SdkModelPropertyType.md)[]

#### Deprecated

This property is deprecated. Access .correspondingMethodParams on the service parameters instead.

#### Inherited from

`SdkServiceMethodBase.getParameterMapping`

***

### ~~getResponseMapping()~~

```ts
getResponseMapping(): undefined | string
```

#### Returns

`undefined` \| `string`

#### Deprecated

This property is deprecated. Access .resultPath on the method response instead.

#### Inherited from

`SdkServiceMethodBase.getResponseMapping`
