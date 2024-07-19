---
jsApi: true
title: "[I] OpenAPI2OAuth2AccessCodeSecurityScheme"

---
OAuth2 Security Code Security Scheme

## Extends

- [`OpenAPI2OAuthSecurityBase`](OpenAPI2OAuthSecurityBase.md)

## Properties

| Property | Type | Description | Overrides | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| `authorizationUrl` | `string` | The authorization URL to be used for this flow. This MUST be in the form of a URL. | - | - |
| `description?` | `string` | A short description for security scheme. | - | [`OpenAPI2OAuthSecurityBase`](OpenAPI2OAuthSecurityBase.md).`description` |
| `flow` | `"accessCode"` | The flow used by the OAuth2 security scheme | [`OpenAPI2OAuthSecurityBase`](OpenAPI2OAuthSecurityBase.md).`flow` | - |
| `scopes` | `Record`<`string`, `string`\> | The available scopes for the OAuth2 security scheme. A map between the scope name and a short description for it. | - | [`OpenAPI2OAuthSecurityBase`](OpenAPI2OAuthSecurityBase.md).`scopes` |
| `tokenUrl` | `string` | The token URL to be used for this flow. This MUST be in the form of a URL. | - | - |
| `type` | `"oauth2"` | The type of the security scheme. Valid values are "basic", "apiKey" or "oauth2". | - | [`OpenAPI2OAuthSecurityBase`](OpenAPI2OAuthSecurityBase.md).`type` |
