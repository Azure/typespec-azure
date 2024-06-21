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
| :------ | :------ | :------ | :------ | :------ |
| `__raw?` | `Type` | - | `SdkTypeBase.__raw` | `SdkTypeBase.__raw` |
| `access` | [`AccessFlags`](../type-aliases/AccessFlags.md) | - | - | - |
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
| ~~`isError`~~ | `boolean` | <p>**Deprecated**</p><p>This property is deprecated. You should not need to check whether a model is an error model.</p> | - | - |
| ~~`isFormDataType`~~ | `boolean` | <p>**Deprecated**</p><p>This property is deprecated. Check the bitwise and value of UsageFlags.MultipartFormData and the `.usage` property on this model.</p> | - | - |
| `isGeneratedName` | `boolean` | - | - | - |
| `kind` | `"model"` | - | `SdkTypeBase.kind` | `SdkTypeBase.kind` |
| `name` | `string` | - | - | - |
| `properties` | [`SdkModelPropertyType`](../type-aliases/SdkModelPropertyType.md)[] | - | - | - |
| `usage` | [`UsageFlags`](../enumerations/UsageFlags.md) | - | - | - |
