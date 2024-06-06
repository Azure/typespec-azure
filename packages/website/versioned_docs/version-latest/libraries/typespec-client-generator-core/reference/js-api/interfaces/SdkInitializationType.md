---
jsApi: true
title: "[I] SdkInitializationType"

---
## Extends

- [`SdkModelType`](SdkModelType.md)

## Properties

| Property | Type | Description | Overrides | Inherited from |
| :------ | :------ | :------ | :------ | :------ |
| `__raw?` | `Type` | - | [`SdkModelType`](SdkModelType.md).`__raw` | [`SdkModelType`](SdkModelType.md).`__raw` |
| `access?` | [`AccessFlags`](../type-aliases/AccessFlags.md) | - | [`SdkModelType`](SdkModelType.md).`access` | [`SdkModelType`](SdkModelType.md).`access` |
| `additionalProperties?` | [`SdkType`](../type-aliases/SdkType.md) | - | [`SdkModelType`](SdkModelType.md).`additionalProperties` | [`SdkModelType`](SdkModelType.md).`additionalProperties` |
| `additionalPropertiesNullable?` | `boolean` | - | [`SdkModelType`](SdkModelType.md).`additionalPropertiesNullable` | [`SdkModelType`](SdkModelType.md).`additionalPropertiesNullable` |
| `apiVersions` | `string`[] | - | [`SdkModelType`](SdkModelType.md).`apiVersions` | [`SdkModelType`](SdkModelType.md).`apiVersions` |
| `baseModel?` | [`SdkModelType`](SdkModelType.md) | - | [`SdkModelType`](SdkModelType.md).`baseModel` | [`SdkModelType`](SdkModelType.md).`baseModel` |
| `crossLanguageDefinitionId` | `string` | - | [`SdkModelType`](SdkModelType.md).`crossLanguageDefinitionId` | [`SdkModelType`](SdkModelType.md).`crossLanguageDefinitionId` |
| `deprecation?` | `string` | - | [`SdkModelType`](SdkModelType.md).`deprecation` | [`SdkModelType`](SdkModelType.md).`deprecation` |
| `description?` | `string` | - | [`SdkModelType`](SdkModelType.md).`description` | [`SdkModelType`](SdkModelType.md).`description` |
| `details?` | `string` | - | [`SdkModelType`](SdkModelType.md).`details` | [`SdkModelType`](SdkModelType.md).`details` |
| `discriminatedSubtypes?` | `Record`<`string`, [`SdkModelType`](SdkModelType.md)\> | - | [`SdkModelType`](SdkModelType.md).`discriminatedSubtypes` | [`SdkModelType`](SdkModelType.md).`discriminatedSubtypes` |
| `discriminatorProperty?` | [`SdkModelPropertyType`](../type-aliases/SdkModelPropertyType.md) | - | [`SdkModelType`](SdkModelType.md).`discriminatorProperty` | [`SdkModelType`](SdkModelType.md).`discriminatorProperty` |
| `discriminatorValue?` | `string` | - | [`SdkModelType`](SdkModelType.md).`discriminatorValue` | [`SdkModelType`](SdkModelType.md).`discriminatorValue` |
| ~~`isError`~~ | `boolean` | **Deprecated**<br />This property is deprecated. You should not need to check whether a model is an error model. | [`SdkModelType`](SdkModelType.md).`isError` | [`SdkModelType`](SdkModelType.md).`isError` |
| ~~`isFormDataType`~~ | `boolean` | **Deprecated**<br />This property is deprecated. Check the bitwise and value of UsageFlags.MultipartFormData nad the `.usage` property on this model | [`SdkModelType`](SdkModelType.md).`isFormDataType` | [`SdkModelType`](SdkModelType.md).`isFormDataType` |
| `isGeneratedName` | `boolean` | - | [`SdkModelType`](SdkModelType.md).`isGeneratedName` | [`SdkModelType`](SdkModelType.md).`isGeneratedName` |
| `kind` | `"model"` | - | [`SdkModelType`](SdkModelType.md).`kind` | [`SdkModelType`](SdkModelType.md).`kind` |
| `name` | `string` | - | [`SdkModelType`](SdkModelType.md).`name` | [`SdkModelType`](SdkModelType.md).`name` |
| ~~`nullable`~~ | `boolean` | **Deprecated**<br />Moving `.nullable` onto the parameter itself for fidelity.<br />https://github.com/Azure/typespec-azure/issues/448 | [`SdkModelType`](SdkModelType.md).`nullable` | [`SdkModelType`](SdkModelType.md).`nullable` |
| `properties` | [`SdkParameter`](../type-aliases/SdkParameter.md)[] | - | [`SdkModelType`](SdkModelType.md).`properties` | [`SdkModelType`](SdkModelType.md).`properties` |
| `usage` | [`UsageFlags`](../enumerations/UsageFlags.md) | - | [`SdkModelType`](SdkModelType.md).`usage` | [`SdkModelType`](SdkModelType.md).`usage` |
