---
jsApi: true
title: "[T] OpenAPI2PathItem"

---
```ts
type OpenAPI2PathItem: { [method in HttpMethod]?: OpenAPI2Operation } & object & Extensions;
```

Describes the operations available on a single path. A Path Item may be empty, due to ACL constraints. The path itself is still exposed to the documentation viewer but they will not know which operations and parameters are available.

## Type declaration

| Name | Type |
| ------ | ------ |
| `parameters`? | [`OpenAPI2Parameter`](OpenAPI2Parameter.md)[] |

## See

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#pathItemObject
