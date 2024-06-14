---
jsApi: true
title: "[I] SdkPackage"

---
## Type parameters

| Type parameter |
| :------ |
| `TServiceOperation` *extends* [`SdkServiceOperation`](../type-aliases/SdkServiceOperation.md) |

## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `clients` | [`SdkClientType`](SdkClientType.md)<`TServiceOperation`\>[] | - |
| `crossLanguagePackageId` | `string` | - |
| ~~`diagnostics`~~ | readonly `Diagnostic`[] | <p>**Deprecated**</p><p>This property is deprecated. Look at `.diagnostics` on SdkContext instead.</p> |
| `enums` | [`SdkEnumType`](SdkEnumType.md)[] | - |
| `models` | [`SdkModelType`](SdkModelType.md)[] | - |
| `name` | `string` | - |
| `rootNamespace` | `string` | - |
