---
jsApi: true
title: "[I] SdkTupleType"

---
## Extends

- `SdkTypeBase`

## Properties

| Property | Type | Description | Overrides | Inherited from |
| :------ | :------ | :------ | :------ | :------ |
| `__raw?` | `Type` | - | `SdkTypeBase.__raw` | `SdkTypeBase.__raw` |
| `deprecation?` | `string` | - | `SdkTypeBase.deprecation` | `SdkTypeBase.deprecation` |
| `kind` | `"tuple"` | - | `SdkTypeBase.kind` | `SdkTypeBase.kind` |
| ~~`nullable`~~ | `boolean` | **Deprecated**<br />Moving `.nullable` onto the parameter itself for fidelity.<br />https://github.com/Azure/typespec-azure/issues/448 | `SdkTypeBase.nullable` | `SdkTypeBase.nullable` |
| `values` | [`SdkType`](../type-aliases/SdkType.md)[] | - | - | - |
