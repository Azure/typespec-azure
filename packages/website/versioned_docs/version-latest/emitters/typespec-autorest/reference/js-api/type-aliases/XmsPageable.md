---
jsApi: true
title: "[T] XmsPageable"

---
```ts
type XmsPageable: object;
```

Model for x-ms-pageable extension.
https://github.com/Azure/autorest/blob/main/docs/extensions/readme.md#x-ms-pageable

## Type declaration

| Name | Type | Description |
| ------ | ------ | ------ |
| `itemName`? | `string` | Name of the property containing the page items. Default: "value" |
| `nextLinkName` | `string` | Name of the property containing url to the next link. |
| `operationName`? | `string` | Specifies the name (operationId) of the operation for retrieving the next page. Default: "<operationId>Next" |
