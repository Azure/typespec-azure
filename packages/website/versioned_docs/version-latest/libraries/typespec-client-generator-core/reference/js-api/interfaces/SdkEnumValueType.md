---
jsApi: true
title: "[I] SdkEnumValueType"

---
## Extends

- `SdkTypeBase`

## Properties

| Property | Type | Description | Overrides | Inherited from |
| :------ | :------ | :------ | :------ | :------ |
| `__raw?` | `Type` | - | `SdkTypeBase.__raw` | `SdkTypeBase.__raw` |
| `deprecation?` | `string` | - | `SdkTypeBase.deprecation` | `SdkTypeBase.deprecation` |
| `description?` | `string` | - | - | - |
| `details?` | `string` | - | - | - |
| `enumType` | [`SdkEnumType`](SdkEnumType.md) | - | - | - |
| `kind` | `"enumvalue"` | - | `SdkTypeBase.kind` | `SdkTypeBase.kind` |
| `name` | `string` | - | - | - |
| ~~`nullable`~~ | `boolean` | **Deprecated**<br />Moving `.nullable` onto the parameter itself for fidelity.<br />https://github.com/Azure/typespec-azure/issues/448 | `SdkTypeBase.nullable` | `SdkTypeBase.nullable` |
| `value` | `string` \| `number` | - | - | - |
| `valueType` | [`SdkBuiltInType`](SdkBuiltInType.md) | - | - | - |
