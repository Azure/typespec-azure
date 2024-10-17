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
| `doc?` | `string` | `SdkServiceMethodBase.doc` |
| `exception?` | [`SdkMethodResponse`](SdkMethodResponse.md) | `SdkServiceMethodBase.exception` |
| `generateConvenient` | `boolean` | `SdkServiceMethodBase.generateConvenient` |
| `generateProtocol` | `boolean` | `SdkServiceMethodBase.generateProtocol` |
| `kind` | `"basic"` | - |
| `name` | `string` | `SdkServiceMethodBase.name` |
| `operation` | `TServiceOperation` | `SdkServiceMethodBase.operation` |
| `parameters` | [`SdkMethodParameter`](SdkMethodParameter.md)[] | `SdkServiceMethodBase.parameters` |
| `response` | [`SdkMethodResponse`](SdkMethodResponse.md) | `SdkServiceMethodBase.response` |
| `summary?` | `string` | `SdkServiceMethodBase.summary` |
