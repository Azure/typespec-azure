---
jsApi: true
title: "[I] SdkModelPropertyTypeBase"

---
## Extends

- `DecoratedType`

## Extended by

- [`SdkEndpointParameter`](SdkEndpointParameter.md)
- [`SdkCredentialParameter`](SdkCredentialParameter.md)
- [`SdkBodyModelPropertyType`](SdkBodyModelPropertyType.md)
- [`SdkHeaderParameter`](SdkHeaderParameter.md)
- [`SdkQueryParameter`](SdkQueryParameter.md)
- [`SdkPathParameter`](SdkPathParameter.md)
- [`SdkBodyParameter`](SdkBodyParameter.md)
- [`SdkMethodParameter`](SdkMethodParameter.md)

## Properties

| Property | Type | Description | Inherited from |
| ------ | ------ | ------ | ------ |
| `__raw?` | `ModelProperty` | - | - |
| `apiVersions` | `string`[] | - | - |
| `clientDefaultValue?` | `any` | - | - |
| `crossLanguageDefinitionId` | `string` | - | - |
| `decorators` | [`DecoratorInfo`](DecoratorInfo.md)[] | - | `DecoratedType.decorators` |
| ~~`description?`~~ | `string` | **Deprecated** Use `doc` and `summary` instead. | - |
| ~~`details?`~~ | `string` | **Deprecated** Use `doc` and `summary` instead. | - |
| `doc?` | `string` | - | - |
| `isApiVersionParam` | `boolean` | - | - |
| `isGeneratedName` | `boolean` | - | - |
| `name` | `string` | - | - |
| `onClient` | `boolean` | - | - |
| `optional` | `boolean` | - | - |
| `summary?` | `string` | - | - |
| `type` | [`SdkType`](../type-aliases/SdkType.md) | - | - |
