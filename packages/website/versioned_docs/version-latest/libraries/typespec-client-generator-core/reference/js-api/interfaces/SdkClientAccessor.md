---
jsApi: true
title: "[I] SdkClientAccessor"

---
## Extends

- `SdkMethodBase`

## Type Parameters

| Type Parameter |
| ------ |
| `TServiceOperation` *extends* [`SdkServiceOperation`](../type-aliases/SdkServiceOperation.md) |

## Properties

| Property | Type | Description | Inherited from |
| ------ | ------ | ------ | ------ |
| `__raw?` | `Operation` | - | `SdkMethodBase.__raw` |
| `access` | [`AccessFlags`](../type-aliases/AccessFlags.md) | - | `SdkMethodBase.access` |
| `apiVersions` | `string`[] | - | `SdkMethodBase.apiVersions` |
| `crossLanguageDefintionId` | `string` | - | `SdkMethodBase.crossLanguageDefintionId` |
| `decorators` | [`DecoratorInfo`](DecoratorInfo.md)[] | - | `SdkMethodBase.decorators` |
| ~~`description?`~~ | `string` | **Deprecated** Use `doc` and `summary` instead. | `SdkMethodBase.description` |
| ~~`details?`~~ | `string` | **Deprecated** Use `doc` and `summary` instead. | `SdkMethodBase.details` |
| `doc?` | `string` | - | `SdkMethodBase.doc` |
| `kind` | `"clientaccessor"` | - | - |
| `name` | `string` | - | `SdkMethodBase.name` |
| `parameters` | [`SdkParameter`](../type-aliases/SdkParameter.md)[] | - | `SdkMethodBase.parameters` |
| `response` | [`SdkClientType`](SdkClientType.md)<`TServiceOperation`\> | - | - |
| `summary?` | `string` | - | `SdkMethodBase.summary` |