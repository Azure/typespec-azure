---
jsApi: true
title: "[I] SdkModelPropertyTypeBase"

---
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

| Property | Type | Description |
| :------ | :------ | :------ |
| `__raw?` | `ModelProperty` | - |
| `apiVersions` | `string`[] | - |
| `clientDefaultValue?` | `any` | - |
| `description?` | `string` | - |
| `details?` | `string` | - |
| `isApiVersionParam` | `boolean` | - |
| `isGeneratedName` | `boolean` | - |
| `name` | `string` | - |
| ~~`nameInClient`~~ | `string` | **Deprecated**<br />This property is deprecated. Use `.name` instead.<br />https://github.com/Azure/typespec-azure/issues/446 |
| `nullable` | `boolean` | - |
| `onClient` | `boolean` | - |
| `optional` | `boolean` | - |
| `type` | [`SdkType`](../type-aliases/SdkType.md) | - |
