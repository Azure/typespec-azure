---
jsApi: true
title: "[I] OpenAPI2ApiKeySecurityScheme"

---
ApiKey Security Scheme

## Extends

- [`OpenAPI2SecuritySchemeBase`](OpenAPI2SecuritySchemeBase.md)

## Properties

| Property | Type | Description | Overrides | Inherited from |
| :------ | :------ | :------ | :------ | :------ |
| `description?` | `string` | A short description for security scheme. | [`OpenAPI2SecuritySchemeBase`](OpenAPI2SecuritySchemeBase.md).`description` | [`OpenAPI2SecuritySchemeBase`](OpenAPI2SecuritySchemeBase.md).`description` |
| `in` | `"header"` \| `"query"` | The location of the API key. Valid values are "query" or "header". | - | - |
| `name` | `string` | The name of the header or query parameter to be used. | - | - |
| `type` | `"apiKey"` | ApiKey | [`OpenAPI2SecuritySchemeBase`](OpenAPI2SecuritySchemeBase.md).`type` | [`OpenAPI2SecuritySchemeBase`](OpenAPI2SecuritySchemeBase.md).`type` |
