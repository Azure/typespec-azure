---
jsApi: true
title: "[I] SdkPackage"

---
## Type parameters

| Type parameter |
| :------ |
| `TServiceOperation` extends [`SdkServiceOperation`](../type-aliases/SdkServiceOperation.md) |

## Properties

| Property | Type |
| :------ | :------ |
| `clients` | [`SdkClientType`](SdkClientType.md)<`TServiceOperation`\>[] |
| `diagnostics` | readonly `Diagnostic`[] |
| `enums` | [`SdkEnumType`](SdkEnumType.md)[] |
| `models` | [`SdkModelType`](SdkModelType.md)[] |
| `name` | `string` |
| `rootNamespace` | `string` |
