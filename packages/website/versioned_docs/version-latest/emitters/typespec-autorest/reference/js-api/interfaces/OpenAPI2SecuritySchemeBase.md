---
jsApi: true
title: "[I] OpenAPI2SecuritySchemeBase"

---
Allows the definition of a security scheme that can be used by the operations. Supported schemes are basic authentication, an API key (either as a header or as a query parameter) and OAuth2's common flows (implicit, password, application and access code).

## See

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#security-scheme-object

## Extends

- [`Extensions`](../type-aliases/Extensions.md)

## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `description?` | `string` | A short description for security scheme. |
| `type` | `"basic"` \| `"apiKey"` \| `"oauth2"` | The type of the security scheme. Valid values are "basic", "apiKey" or "oauth2". |
