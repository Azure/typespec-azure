---
jsApi: true
title: "[I] SdkModelType"

---
## Extends

- `SdkTypeBase`

## Extended by

- [`SdkInitializationType`](SdkInitializationType.md)

## Properties

| Property | Type | Description | Overrides | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| `__raw?` | `Type` | - | - | `SdkTypeBase.__raw` |
| `access` | [`AccessFlags`](../type-aliases/AccessFlags.md) | - | - | - |
| `additionalProperties?` | [`SdkType`](../type-aliases/SdkType.md) | - | - | - |
| `apiVersions` | `string`[] | - | - | - |
| `baseModel?` | [`SdkModelType`](SdkModelType.md) | - | - | - |
| `crossLanguageDefinitionId` | `string` | - | - | - |
| `decorators` | [`DecoratorInfo`](DecoratorInfo.md)[] | - | - | `SdkTypeBase.decorators` |
| `deprecation?` | `string` | - | - | `SdkTypeBase.deprecation` |
| `description?` | `string` | - | - | `SdkTypeBase.description` |
| `details?` | `string` | - | - | `SdkTypeBase.details` |
| `discriminatedSubtypes?` | `Record`<`string`, [`SdkModelType`](SdkModelType.md)\> | - | - | - |
| `discriminatorProperty?` | [`SdkModelPropertyType`](../type-aliases/SdkModelPropertyType.md) | - | - | - |
| `discriminatorValue?` | `string` | - | - | - |
| ~~`isFormDataType`~~ | `boolean` | **Deprecated** This property is deprecated. Check the bitwise and value of UsageFlags.MultipartFormData and the `.usage` property on this model. | - | - |
| `isGeneratedName` | `boolean` | - | - | - |
| `kind` | `"model"` | - | `SdkTypeBase.kind` | - |
| `name` | `string` | - | - | - |
| `properties` | [`SdkModelPropertyType`](../type-aliases/SdkModelPropertyType.md)[] | - | - | - |
| `usage` | [`UsageFlags`](../enumerations/UsageFlags.md) | - | - | - |
