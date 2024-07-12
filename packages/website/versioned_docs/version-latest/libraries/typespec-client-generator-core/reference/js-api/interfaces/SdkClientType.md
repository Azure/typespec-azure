---
jsApi: true
title: "[I] SdkClientType"

---
## Type parameters

| Type parameter |
| :------ |
| `TServiceOperation` *extends* [`SdkServiceOperation`](../type-aliases/SdkServiceOperation.md) |

## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `apiVersions` | `string`[] | - |
| ~~`arm`~~ | `boolean` | <p>**Deprecated**</p><p>This property is deprecated. Look at `.arm` on `SdkContext` instead.</p> |
| `description?` | `string` | - |
| `details?` | `string` | - |
| `initialization` | [`SdkInitializationType`](SdkInitializationType.md) | - |
| `kind` | `"client"` | - |
| `methods` | [`SdkMethod`](../type-aliases/SdkMethod.md)<`TServiceOperation`\>[] | - |
| `name` | `string` | - |
| `nameSpace` | `string` | - |
