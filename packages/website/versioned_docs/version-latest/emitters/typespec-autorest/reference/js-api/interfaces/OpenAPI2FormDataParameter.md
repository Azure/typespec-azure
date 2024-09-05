---
jsApi: true
title: "[I] OpenAPI2FormDataParameter"

---
## Extends

- [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md)

## Properties

| Property | Type | Description | Overrides | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| `allOf?` | [`OpenAPI2Schema`](../type-aliases/OpenAPI2Schema.md)[] | - | - | - |
| `allowEmptyValue?` | `boolean` | - | - | - |
| `collectionFormat?` | \| `"multi"` \| `"csv"` \| `"ssv"` \| `"tsv"` \| `"pipes"` | - | - | - |
| `default?` | `unknown` | - | - | - |
| `description?` | `string` | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`description` | - |
| `enum?` | `string`[] | - | - | - |
| `example?` | `unknown` | - | - | - |
| `format?` | `string` | - | - | - |
| `in` | `"formData"` | - | - | - |
| `items?` | [`PrimitiveItems`](PrimitiveItems.md) | - | - | - |
| `name` | `string` | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`name` | - |
| `required?` | `boolean` | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`required` | - |
| `schema?` | [`OpenAPI2Schema`](../type-aliases/OpenAPI2Schema.md) | - | - | - |
| `type` | \| `"string"` \| `"number"` \| `"boolean"` \| `"file"` \| `"integer"` \| `"array"` | - | - | - |
| `x-ms-client-flatten?` | `boolean` | - | - | - |
| `x-ms-client-name?` | `string` | Provide a different name to be used in the client. | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`x-ms-client-name` |
| `x-ms-parameter-location?` | `string` | - | - | [`OpenAPI2ParameterBase`](OpenAPI2ParameterBase.md).`x-ms-parameter-location` |
