---
jsApi: true
title: "[I] OpenAPI2PathParameter"

---
## Extends

- [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md)

## Properties

| Property | Type | Description | Overrides | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| `allowEmptyValue?` | `boolean` | - | - | - |
| `collectionFormat?` | `"csv"` \| `"ssv"` \| `"tsv"` \| `"pipes"` | - | - | - |
| `default?` | `unknown` | - | - | - |
| `description?` | `string` | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`description` | - |
| `enum?` | `string`[] | - | - | - |
| `format?` | `string` | - | - | - |
| `in` | `"path"` | - | - | - |
| `items?` | [`PrimitiveItems`](PrimitiveItems.md) | - | - | - |
| `name` | `string` | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`name` | - |
| `required?` | `boolean` | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`required` | - |
| `type` | \| `"string"` \| `"number"` \| `"boolean"` \| `"integer"` \| `"array"` | - | - | - |
| `x-ms-client-name?` | `string` | Provide a different name to be used in the client. | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`x-ms-client-name` |
| `x-ms-parameter-location?` | `string` | - | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`x-ms-parameter-location` |
| `x-ms-skip-url-encoding?` | `boolean` | - | - | - |
