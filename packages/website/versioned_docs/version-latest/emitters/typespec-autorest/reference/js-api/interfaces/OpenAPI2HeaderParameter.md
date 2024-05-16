---
jsApi: true
title: "[I] OpenAPI2HeaderParameter"

---
## Extends

- [`OpenAPI2HeaderDefinition`](OpenAPI2HeaderDefinition.md).[`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md)

## Properties

| Property | Type | Description | Inherited from |
| :------ | :------ | :------ | :------ |
| `collectionFormat?` | `"csv"` \| `"ssv"` \| `"tsv"` \| `"pipes"` | - | [`OpenAPI2HeaderDefinition`](OpenAPI2HeaderDefinition.md).`collectionFormat` |
| `description?` | `string` | - | [`OpenAPI2HeaderDefinition`](OpenAPI2HeaderDefinition.md).`description` |
| `format?` | `string` | - | [`OpenAPI2HeaderDefinition`](OpenAPI2HeaderDefinition.md).`format` |
| `in` | `"header"` | - | - |
| `items?` | [`OpenAPI2Schema`](../type-aliases/OpenAPI2Schema.md) | - | [`OpenAPI2HeaderDefinition`](OpenAPI2HeaderDefinition.md).`items` |
| `name` | `string` | - | - |
| `required?` | `boolean` | - | - |
| `type` |  \| `"string"` \| `"number"` \| `"boolean"` \| `"integer"` \| `"array"` | - | [`OpenAPI2HeaderDefinition`](OpenAPI2HeaderDefinition.md).`type` |
| `x-ms-client-name?` | `string` | Provide a different name to be used in the client. | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`x-ms-client-name` |
| `x-ms-parameter-location?` | `string` | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`x-ms-parameter-location` |
