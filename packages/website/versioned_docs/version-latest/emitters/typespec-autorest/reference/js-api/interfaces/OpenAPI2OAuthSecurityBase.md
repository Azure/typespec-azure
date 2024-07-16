---
jsApi: true
title: "[I] OpenAPI2OAuthSecurityBase"

---
Allows the definition of a security scheme that can be used by the operations. Supported schemes are basic authentication, an API key (either as a header or as a query parameter) and OAuth2's common flows (implicit, password, application and access code).

## See

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#security-scheme-object

## Extends

- [`OpenAPI2SecuritySchemeBase`](OpenAPI2SecuritySchemeBase.md)

## Extended by

- [`OpenAPI2OAuth2ImplicitSecurityScheme`](OpenAPI2OAuth2ImplicitSecurityScheme.md)
- [`OpenAPI2OAuth2PasswordSecurityScheme`](OpenAPI2OAuth2PasswordSecurityScheme.md)
- [`OpenAPI2OAuth2ApplicationSecurityScheme`](OpenAPI2OAuth2ApplicationSecurityScheme.md)
- [`OpenAPI2OAuth2AccessCodeSecurityScheme`](OpenAPI2OAuth2AccessCodeSecurityScheme.md)

## Properties

| Property | Type | Description | Overrides | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| `description?` | `string` | A short description for security scheme. | - | [`OpenAPI2SecuritySchemeBase`](OpenAPI2SecuritySchemeBase.md).`description` |
| `flow` | [`OpenAPI2OAuth2FlowType`](../type-aliases/OpenAPI2OAuth2FlowType.md) | The flow used by the OAuth2 security scheme | - | - |
| `scopes` | `Record`<`string`, `string`\> | The available scopes for the OAuth2 security scheme. A map between the scope name and a short description for it. | - | - |
| `type` | `"oauth2"` | The type of the security scheme. Valid values are "basic", "apiKey" or "oauth2". | [`OpenAPI2SecuritySchemeBase`](OpenAPI2SecuritySchemeBase.md).`type` | - |
