---
jsApi: true
title: "[I] OpenAPI2Response"

---
Describes a single response from an API Operation.

## See

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#response-object

## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `description` | `string` | A short description of the response. Commonmark syntax can be used for rich text representation |
| `examples?` | `Record`<`string`, [`OpenAPI2Example`](OpenAPI2Example.md)\> | An example of the response message. |
| `headers?` | `Record`<`string`, [`OpenAPI2HeaderDefinition`](OpenAPI2HeaderDefinition.md)\> | A list of headers that are sent with the response. |
| `schema?` | [`OpenAPI2Schema`](../type-aliases/OpenAPI2Schema.md) \| [`OpenAPI2FileSchema`](../type-aliases/OpenAPI2FileSchema.md) | A definition of the response structure. It can be a primitive, an array or an object. If this field does not exist, it means no content is returned as part of the response. As an extension to the Schema Object, its root type value may also be "file". This SHOULD be accompanied by a relevant produces mime-type. |
| `x-ms-error-response?` | `boolean` | Indicates whether the response status code should be treated as an error response. |
