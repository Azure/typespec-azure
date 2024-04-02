---
jsApi: true
title: "[I] SdkEnumType"

---
## Extends

- `SdkTypeBase`

## Properties

| Property | Type | Description | Overrides | Inherited from |
| :------ | :------ | :------ | :------ | :------ |
| `__raw?` | `Type` | - | `SdkTypeBase.__raw` | `SdkTypeBase.__raw` |
| `access?` | [`AccessFlags`](../type-aliases/AccessFlags.md) | - | - | - |
| `apiVersions` | `string`[] | - | - | - |
| `crossLanguageDefinitionId` | `string` | - | - | - |
| `deprecation?` | `string` | - | `SdkTypeBase.deprecation` | `SdkTypeBase.deprecation` |
| `description?` | `string` | - | - | - |
| `details?` | `string` | - | - | - |
| `isFixed` | `boolean` | - | - | - |
| `isFlags` | `boolean` | - | - | - |
| `isGeneratedName` | `boolean` | - | - | - |
| `isUnionAsEnum` | `boolean` | - | - | - |
| `kind` | `"enum"` | - | `SdkTypeBase.kind` | `SdkTypeBase.kind` |
| `name` | `string` | - | - | - |
| ~~`nullable`~~ | `boolean` | **Deprecated**<br />Moving `.nullable` onto the parameter itself for fidelity.<br />https://github.com/Azure/typespec-azure/issues/448 | `SdkTypeBase.nullable` | `SdkTypeBase.nullable` |
| `usage` | [`UsageFlags`](../enumerations/UsageFlags.md) | - | - | - |
| `valueType` | [`SdkBuiltInType`](SdkBuiltInType.md) | - | - | - |
| `values` | [`SdkEnumValueType`](SdkEnumValueType.md)[] | - | - | - |
