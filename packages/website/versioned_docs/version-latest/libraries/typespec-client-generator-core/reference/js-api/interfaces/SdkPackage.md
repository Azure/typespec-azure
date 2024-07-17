---
jsApi: true
title: "[I] SdkPackage"

---
## Type Parameters

| Type Parameter |
| ------ |
| `TServiceOperation` *extends* [`SdkServiceOperation`](../type-aliases/SdkServiceOperation.md) |

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| `clients` | [`SdkClientType`](SdkClientType.md)<`TServiceOperation`\>[] | - |
| `crossLanguagePackageId` | `string` | - |
| ~~`diagnostics`~~ | readonly `Diagnostic`[] | **Deprecated** This property is deprecated. Look at `.diagnostics` on SdkContext instead. |
| `enums` | [`SdkEnumType`](SdkEnumType.md)[] | - |
| `models` | [`SdkModelType`](SdkModelType.md)[] | - |
| `name` | `string` | - |
| `rootNamespace` | `string` | - |
