---
jsApi: true
title: "[T] OpenAPI2SecurityRequirement"

---
```ts
type OpenAPI2SecurityRequirement: Record<string, string[]>;
```

Lists the required security schemes to execute this operation. The object can have multiple security schemes declared in it which are all required (that is, there is a logical AND between the schemes).

The name used for each property MUST correspond to a security scheme declared in the Security Definitions.

## See

/https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#security-requirement-object
