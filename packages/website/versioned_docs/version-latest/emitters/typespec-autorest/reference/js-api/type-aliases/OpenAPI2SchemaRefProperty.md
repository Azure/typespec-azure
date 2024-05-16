---
jsApi: true
title: "[T] OpenAPI2SchemaRefProperty"

---
```ts
type OpenAPI2SchemaRefProperty: Ref<OpenAPI2Schema> & Pick<OpenAPI2Schema, "readOnly" | "description" | "default" | "x-ms-mutability"> & Object;
```

Autorest allows a few properties to be next to $ref of a property.

## Type declaration

| Member | Type | Description |
| :------ | :------ | :------ |
| `x-ms-client-name` | `string` | Provide a different name to be used in the client. |
