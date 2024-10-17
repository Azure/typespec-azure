---
jsApi: true
title: "[V] $lib"

---
```ts
const $lib: TypeSpecLibrary<object, AutorestEmitterOptions, "example" | "useRef">;
```

## Type declaration

| Name | Type | Default value |
| ------ | ------ | ------ |
| `duplicate-body-types` | `object` | - |
| `duplicate-body-types.default` | `"Request has multiple body types"` | "Request has multiple body types" |
| `duplicate-example` | `object` | - |
| `duplicate-example.default` | `"Duplicate @example declarations on operation"` | "Duplicate @example declarations on operation" |
| `duplicate-example-file` | `object` | - |
| `duplicate-example-file.default` | `CallableMessage`<[`"filename"`, `"title"`, `"operationId"`]\> | - |
| `duplicate-header` | `object` | - |
| `duplicate-header.default` | `CallableMessage`<[`"header"`]\> | - |
| `example-loading` | `object` | - |
| `example-loading.default` | `CallableMessage`<[`"filename"`, `"error"`]\> | - |
| `example-loading.noDirectory` | `CallableMessage`<[`"directory"`]\> | - |
| `example-loading.noOperationId` | `CallableMessage`<[`"filename"`]\> | - |
| `inline-cycle` | `object` | - |
| `inline-cycle.default` | `CallableMessage`<[`"type"`]\> | - |
| `invalid-format` | `object` | - |
| `invalid-format.default` | `CallableMessage`<[`"schema"`, `"format"`]\> | - |
| `invalid-multi-collection-format` | `object` | - |
| `invalid-multi-collection-format.default` | `"The 'multi' should be applied to parameter in 'query', 'header' or 'formData'."` | "The 'multi' should be applied to parameter in 'query', 'header' or 'formData'." |
| `invalid-schema` | `object` | - |
| `invalid-schema.default` | `CallableMessage`<[`"type"`]\> | - |
| `nonspecific-scalar` | `object` | - |
| `nonspecific-scalar.default` | `CallableMessage`<[`"type"`, `"chosenType"`]\> | - |
| `union-null` | `object` | - |
| `union-null.default` | `"Cannot have a union containing only null types."` | "Cannot have a union containing only null types." |
| `union-unsupported` | `object` | - |
| `union-unsupported.default` | `"Unions cannot be emitted to OpenAPI v2 unless all options are literals of the same type."` | "Unions cannot be emitted to OpenAPI v2 unless all options are literals of the same type." |
| `union-unsupported.empty` | `"Empty unions are not supported for OpenAPI v2 - enums must have at least one value."` | "Empty unions are not supported for OpenAPI v2 - enums must have at least one value." |
| `unsupported-auth` | `object` | - |
| `unsupported-auth.default` | `CallableMessage`<[`"authType"`]\> | - |
| `unsupported-http-auth-scheme` | `object` | - |
| `unsupported-http-auth-scheme.default` | `CallableMessage`<[`"scheme"`]\> | - |
| `unsupported-multipart-type` | `object` | - |
| `unsupported-multipart-type.default` | `CallableMessage`<[`"part"`]\> | - |
| `unsupported-param-type` | `object` | - |
| `unsupported-param-type.default` | `CallableMessage`<[`"part"`]\> | - |
| `unsupported-status-code-range` | `object` | - |
| `unsupported-status-code-range.default` | `CallableMessage`<[`"start"`, `"end"`]\> | - |
