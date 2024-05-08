---
jsApi: true
title: "[T] OpenAPI2SecurityScheme"

---
```ts
type OpenAPI2SecurityScheme: 
  | OpenAPI2BasicAuthenticationSecurityScheme
  | OpenAPI2OAuth2AccessCodeSecurityScheme
  | OpenAPI2OAuth2ApplicationSecurityScheme
  | OpenAPI2OAuth2ImplicitSecurityScheme
  | OpenAPI2OAuth2PasswordSecurityScheme
  | OpenAPI2ApiKeySecurityScheme;
```

Allows the definition of a security scheme that can be used by the operations. Supported schemes are basic authentication, an API key (either as a header or as a query parameter) and OAuth2's common flows (implicit, password, application and access code).

## See

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#security-scheme-object
