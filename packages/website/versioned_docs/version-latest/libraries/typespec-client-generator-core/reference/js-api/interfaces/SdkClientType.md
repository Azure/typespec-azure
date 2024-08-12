---
jsApi: true
title: "[I] SdkClientType"

---
## Extends

- `DecoratedType`

## Type Parameters

| Type Parameter |
| ------ |
| `TServiceOperation` *extends* [`SdkServiceOperation`](../type-aliases/SdkServiceOperation.md) |

## Properties

| Property | Type | Description | Inherited from |
| ------ | ------ | ------ | ------ |
| `apiVersions` | `string`[] | - | - |
| ~~`arm`~~ | `boolean` | **Deprecated** This property is deprecated. Look at `.arm` on `SdkContext` instead. | - |
| `crossLanguageDefinitionId` | `string` | - | - |
| `decorators` | [`DecoratorInfo`](DecoratorInfo.md)[] | - | `DecoratedType.decorators` |
| `description?` | `string` | - | - |
| `details?` | `string` | - | - |
| `initialization` | [`SdkInitializationType`](SdkInitializationType.md) | - | - |
| `kind` | `"client"` | - | - |
| `methods` | [`SdkMethod`](../type-aliases/SdkMethod.md)<`TServiceOperation`\>[] | - | - |
| `name` | `string` | - | - |
| `nameSpace` | `string` | - | - |
