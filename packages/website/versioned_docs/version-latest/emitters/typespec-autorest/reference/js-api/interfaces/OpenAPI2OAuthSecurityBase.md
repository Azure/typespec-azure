---
jsApi: true
title: "[I] OpenAPI2OAuthSecurityBase"

---
Allows the definition of a security scheme that can be used by the operations. Supported schemes are basic authentication, an API key (either as a header or as a query parameter) and OAuth2's common flows (implicit, password, application and access code).

## See

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#security-scheme-object

## Extends

- [`OpenAPI2SecuritySchemeBase`](OpenAPI2SecuritySchemeBase.md)

## Properties

| Property | Type | Description | Overrides | Inherited from |
| :------ | :------ | :------ | :------ | :------ |
| `description?` | `string` | A short description for security scheme. | [`OpenAPI2SecuritySchemeBase`](OpenAPI2SecuritySchemeBase.md).`description` | [`OpenAPI2SecuritySchemeBase`](OpenAPI2SecuritySchemeBase.md).`description` |
| `flow` | [`OpenAPI2OAuth2FlowType`](../type-aliases/OpenAPI2OAuth2FlowType.md) | The flow used by the OAuth2 security scheme | - | - |
| `scopes` | `Record`<`string`, `string`\> | The available scopes for the OAuth2 security scheme. A map between the scope name and a short description for it. | - | - |
| `type` | `"oauth2"` | The type of the security scheme. Valid values are "basic", "apiKey" or "oauth2". | [`OpenAPI2SecuritySchemeBase`](OpenAPI2SecuritySchemeBase.md).`type` | [`OpenAPI2SecuritySchemeBase`](OpenAPI2SecuritySchemeBase.md).`type` |
