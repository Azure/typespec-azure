---
jsApi: true
title: "[T] OpenAPI2Operation"

---
```ts
type OpenAPI2Operation: Extensions & object;
```

## Type declaration

| Name | Type | Description |
| ------ | ------ | ------ |
| `consumes` | `string`[] | A list of MIME types the operation can consume. This overrides the consumes definition at the Swagger Object. An empty value MAY be used to clear the global definition. Value MUST be as described under Mime Types. |
| `deprecated` | `boolean` | Declares this operation to be deprecated. Usage of the declared operation should be refrained. Default value is false. |
| `description` | `string` | A verbose explanation of the operation behavior. Commonmark syntax can be used for rich text representation. |
| `externalDocs` | [`OpenAPI2ExternalDocs`](../interfaces/OpenAPI2ExternalDocs.md) | Additional external documentation. |
| `operationId` | `string` | Unique string used to identify the operation. The id MUST be unique among all operations described in the API. Tools and libraries MAY use the operationId to uniquely identify an operation, therefore, it is recommended to follow common programming naming conventions. |
| `parameters` | [`Refable`](Refable.md)<[`OpenAPI2Parameter`](OpenAPI2Parameter.md)\>[] | A list of parameters that are applicable for this operation. If a parameter is already defined at the Path Item, the new definition will override it, but can never remove it. The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a name and location. |
| `produces` | `string`[] | A list of MIME types the operation can produce. This overrides the produces definition at the Swagger Object. An empty value MAY be used to clear the global definition. Value MUST be as described under Mime Types. |
| `responses` | [`OpenAPI2Responses`](OpenAPI2Responses.md) | - |
| `schemes` | `string`[] | The transfer protocol for the operation. Values MUST be from the list: "http", "https", "ws", "wss". The value overrides the Swagger Object schemes definition. |
| `security` | [`OpenAPI2SecurityScheme`](OpenAPI2SecurityScheme.md)[] | declaration of which security schemes are applied for this operation. The list of values describes alternative security schemes that can be used (that is, there is a logical OR between the security requirements). This definition overrides any declared top-level security. To remove a top-level security declaration, an empty array can be used. |
| `summary` | `string` | A short summary of what the operation does. |
| `tags` | `string`[] | A list of tags for API documentation control. Tags can be used for logical grouping of operations by resources or any other qualifier. |
| `x-ms-examples` | `Record`<`string`, [`Ref`](../interfaces/Ref.md)<`unknown`\>\> | - |
| `x-ms-long-running-operation` | `boolean` | - |
| `x-ms-long-running-operation-options` | [`XMSLongRunningOperationOptions`](XMSLongRunningOperationOptions.md) | - |
| `x-ms-pageable` | [`XmsPageable`](XmsPageable.md) | - |
