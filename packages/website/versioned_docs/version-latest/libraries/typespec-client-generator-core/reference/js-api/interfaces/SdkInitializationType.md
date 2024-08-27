---
jsApi: true
title: "[I] SdkInitializationType"

---
## Extends

- [`SdkModelType`](SdkModelType.md)

## Properties

| Property | Type | Description | Overrides | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| `__raw?` | `Type` | - | - | [`SdkModelType`](SdkModelType.md).`__raw` |
| `access` | [`AccessFlags`](../type-aliases/AccessFlags.md) | - | - | [`SdkModelType`](SdkModelType.md).`access` |
| `additionalProperties?` | [`SdkType`](../type-aliases/SdkType.md) | - | - | [`SdkModelType`](SdkModelType.md).`additionalProperties` |
| `apiVersions` | `string`[] | - | - | [`SdkModelType`](SdkModelType.md).`apiVersions` |
| `baseModel?` | [`SdkModelType`](SdkModelType.md) | - | - | [`SdkModelType`](SdkModelType.md).`baseModel` |
| `crossLanguageDefinitionId` | `string` | - | - | [`SdkModelType`](SdkModelType.md).`crossLanguageDefinitionId` |
| `decorators` | [`DecoratorInfo`](DecoratorInfo.md)[] | - | - | [`SdkModelType`](SdkModelType.md).`decorators` |
| `deprecation?` | `string` | - | - | [`SdkModelType`](SdkModelType.md).`deprecation` |
| `description?` | `string` | - | - | [`SdkModelType`](SdkModelType.md).`description` |
| `details?` | `string` | - | - | [`SdkModelType`](SdkModelType.md).`details` |
| `discriminatedSubtypes?` | `Record`<`string`, [`SdkModelType`](SdkModelType.md)\> | - | - | [`SdkModelType`](SdkModelType.md).`discriminatedSubtypes` |
| `discriminatorProperty?` | [`SdkModelPropertyType`](../type-aliases/SdkModelPropertyType.md) | - | - | [`SdkModelType`](SdkModelType.md).`discriminatorProperty` |
| `discriminatorValue?` | `string` | - | - | [`SdkModelType`](SdkModelType.md).`discriminatorValue` |
| ~~`isFormDataType`~~ | `boolean` | **Deprecated** This property is deprecated. Check the bitwise and value of UsageFlags.MultipartFormData and the `.usage` property on this model. | - | [`SdkModelType`](SdkModelType.md).`isFormDataType` |
| `isGeneratedName` | `boolean` | - | - | [`SdkModelType`](SdkModelType.md).`isGeneratedName` |
| `kind` | `"model"` | - | - | [`SdkModelType`](SdkModelType.md).`kind` |
| `name` | `string` | - | - | [`SdkModelType`](SdkModelType.md).`name` |
| `properties` | [`SdkParameter`](../type-aliases/SdkParameter.md)[] | - | [`SdkModelType`](SdkModelType.md).`properties` | - |
| `usage` | [`UsageFlags`](../enumerations/UsageFlags.md) | - | - | [`SdkModelType`](SdkModelType.md).`usage` |
