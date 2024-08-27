---
jsApi: true
title: "[I] OpenAPI2HeaderParameter"

---
## Extends

- [`OpenAPI2HeaderDefinition`](OpenAPI2HeaderDefinition.md).[`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md)

## Properties

| Property | Type | Description | Overrides | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| `collectionFormat?` | `"csv"` \| `"ssv"` \| `"tsv"` \| `"pipes"` | - | - | [`OpenAPI2HeaderDefinition`](OpenAPI2HeaderDefinition.md).`collectionFormat` |
| `default?` | `unknown` | - | - | - |
| `description?` | `string` | - | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`description` |
| `format?` | `string` | - | - | [`OpenAPI2HeaderDefinition`](OpenAPI2HeaderDefinition.md).`format` |
| `in` | `"header"` | - | - | - |
| `items?` | [`PrimitiveItems`](PrimitiveItems.md) | - | - | [`OpenAPI2HeaderDefinition`](OpenAPI2HeaderDefinition.md).`items` |
| `name` | `string` | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`name` | - |
| `required?` | `boolean` | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`required` | - |
| `type` | \| `"string"` \| `"number"` \| `"boolean"` \| `"integer"` \| `"array"` | - | - | [`OpenAPI2HeaderDefinition`](OpenAPI2HeaderDefinition.md).`type` |
| `x-ms-client-name?` | `string` | Provide a different name to be used in the client. | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`x-ms-client-name` |
| `x-ms-parameter-location?` | `string` | - | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`x-ms-parameter-location` |
