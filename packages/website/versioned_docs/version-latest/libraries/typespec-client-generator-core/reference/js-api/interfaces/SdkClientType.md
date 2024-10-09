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

| Property | Type | Inherited from |
| ------ | ------ | ------ |
| `__raw` | [`SdkClient`](SdkClient.md) \| [`SdkOperationGroup`](SdkOperationGroup.md) | - |
| `apiVersions` | `string`[] | - |
| `crossLanguageDefinitionId` | `string` | - |
| `decorators` | [`DecoratorInfo`](DecoratorInfo.md)[] | `DecoratedType.decorators` |
| `doc?` | `string` | - |
| `initialization` | [`SdkInitializationType`](SdkInitializationType.md) | - |
| `kind` | `"client"` | - |
| `methods` | [`SdkMethod`](../type-aliases/SdkMethod.md)<`TServiceOperation`\>[] | - |
| `name` | `string` | - |
| `nameSpace` | `string` | - |
| `parent?` | [`SdkClientType`](SdkClientType.md)<`TServiceOperation`\> | - |
| `summary?` | `string` | - |
