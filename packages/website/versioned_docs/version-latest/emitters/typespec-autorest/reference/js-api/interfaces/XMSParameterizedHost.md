---
jsApi: true
title: "[I] XMSParameterizedHost"

---
## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `hostTemplate` | `string` | Specifies the parameterized template for the host. |
| `parameters?` | [`OpenAPI2Parameter`](../type-aliases/OpenAPI2Parameter.md)[] | The list of parameters that are used within the hostTemplate.<br />This can include both reference parameters as well as explicit parameters. Note that "in" is required and must be set to "path".<br />The reference parameters will be treated as global parameters and will end up as property of the client. |
| `useSchemePrefix?` | `boolean` | Specifies whether to prepend the default scheme a.k.a protocol to the base uri of client.<br /><br />**Default**<br />` true ` |
