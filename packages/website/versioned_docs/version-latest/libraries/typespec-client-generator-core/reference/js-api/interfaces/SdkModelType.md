---
jsApi: true
title: "[I] SdkModelType"

---
## Extends

- `SdkTypeBase`

## Properties

| Property | Type | Description | Overrides | Inherited from |
| :------ | :------ | :------ | :------ | :------ |
| `__raw?` | `Type` | - | `SdkTypeBase.__raw` | `SdkTypeBase.__raw` |
| `access?` | [`AccessFlags`](../type-aliases/AccessFlags.md) | - | - | - |
| `additionalProperties?` | [`SdkType`](../type-aliases/SdkType.md) | - | - | - |
| `apiVersions` | `string`[] | - | - | - |
| `baseModel?` | [`SdkModelType`](SdkModelType.md) | - | - | - |
| `crossLanguageDefinitionId` | `string` | - | - | - |
| `deprecation?` | `string` | - | `SdkTypeBase.deprecation` | `SdkTypeBase.deprecation` |
| `description?` | `string` | - | `SdkTypeBase.description` | `SdkTypeBase.description` |
| `details?` | `string` | - | `SdkTypeBase.details` | `SdkTypeBase.details` |
| `discriminatedSubtypes?` | `Record`<`string`, [`SdkModelType`](SdkModelType.md)\> | - | - | - |
| `discriminatorProperty?` | [`SdkModelPropertyType`](../type-aliases/SdkModelPropertyType.md) | - | - | - |
| `discriminatorValue?` | `string` | - | - | - |
| ~~`isError`~~ | `boolean` | **Deprecated**<br />This property is deprecated. You should not need to check whether a model is an error model. | - | - |
| ~~`isFormDataType`~~ | `boolean` | **Deprecated**<br />This property is deprecated. Check the bitwise and value of UsageFlags.MultipartFormData nad the `.usage` property on this model | - | - |
| `isGeneratedName` | `boolean` | - | - | - |
| `kind` | `"model"` | - | `SdkTypeBase.kind` | `SdkTypeBase.kind` |
| `name` | `string` | - | - | - |
| ~~`nullable`~~ | `boolean` | **Deprecated**<br />Moving `.nullable` onto the parameter itself for fidelity.<br />https://github.com/Azure/typespec-azure/issues/448 | `SdkTypeBase.nullable` | `SdkTypeBase.nullable` |
| `properties` | [`SdkModelPropertyType`](../type-aliases/SdkModelPropertyType.md)[] | - | - | - |
| `usage` | [`UsageFlags`](../enumerations/UsageFlags.md) | - | - | - |
