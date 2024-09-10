---
jsApi: true
title: "[I] SdkUnionType"

---
## Extends

- `SdkTypeBase`

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TValueType` *extends* `SdkTypeBase` | [`SdkType`](../type-aliases/SdkType.md) |

## Properties

| Property | Type | Description | Overrides | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| `__accessSet?` | `boolean` | - | - | `SdkTypeBase.__accessSet` |
| `__raw?` | `Type` | - | - | `SdkTypeBase.__raw` |
| `crossLanguageDefinitionId` | `string` | - | - | - |
| `decorators` | [`DecoratorInfo`](DecoratorInfo.md)[] | - | - | `SdkTypeBase.decorators` |
| `deprecation?` | `string` | - | - | `SdkTypeBase.deprecation` |
| ~~`description?`~~ | `string` | **Deprecated** Use `doc` and `summary` instead. | - | `SdkTypeBase.description` |
| ~~`details?`~~ | `string` | **Deprecated** Use `doc` and `summary` instead. | - | `SdkTypeBase.details` |
| `doc?` | `string` | - | - | `SdkTypeBase.doc` |
| `isGeneratedName` | `boolean` | - | - | - |
| `kind` | `"union"` | - | `SdkTypeBase.kind` | - |
| `name` | `string` | - | - | - |
| `summary?` | `string` | - | - | `SdkTypeBase.summary` |
| `values` | `TValueType`[] | - | - | - |
