---
jsApi: true
title: "[V] $lib"

---
```ts
const $lib: TypeSpecLibrary<Object, AutorestEmitterOptions, never>;
```

## Type declaration

| Member | Type | Value |
| :------ | :------ | :------ |
| `duplicate-body-types` | `Object` | - |
| `duplicate-body-types.default` | `"Request has multiple body types"` | "Request has multiple body types" |
| `duplicate-example` | `Object` | - |
| `duplicate-example.default` | `"Duplicate @example declarations on operation"` | "Duplicate @example declarations on operation" |
| `duplicate-example-file` | `Object` | - |
| `duplicate-example-file.default` | `CallableMessage`<[`"filename"`, `"title"`, `"operationId"`]\> | - |
| `duplicate-header` | `Object` | - |
| `duplicate-header.default` | `CallableMessage`<[`"header"`]\> | - |
| `example-loading` | `Object` | - |
| `example-loading.default` | `CallableMessage`<[`"filename"`, `"error"`]\> | - |
| `example-loading.noDirectory` | `CallableMessage`<[`"directory"`]\> | - |
| `example-loading.noOperationId` | `CallableMessage`<[`"filename"`]\> | - |
| `inline-cycle` | `Object` | - |
| `inline-cycle.default` | `CallableMessage`<[`"type"`]\> | - |
| `invalid-collection-format` | `Object` | - |
| `invalid-collection-format.default` | `"The format should be one of 'csv','ssv','tsv','pipes' and 'multi'."` | "The format should be one of 'csv','ssv','tsv','pipes' and 'multi'." |
| `invalid-default` | `Object` | - |
| `invalid-default.default` | `CallableMessage`<[`"type"`]\> | - |
| `invalid-format` | `Object` | - |
| `invalid-format.default` | `CallableMessage`<[`"schema"`, `"format"`]\> | - |
| `invalid-multi-collection-format` | `Object` | - |
| `invalid-multi-collection-format.default` | `"The 'multi' should be applied to parameter in 'query', 'header' or 'formData'."` | "The 'multi' should be applied to parameter in 'query', 'header' or 'formData'." |
| `invalid-property-type-for-collection-format` | `Object` | - |
| `invalid-property-type-for-collection-format.default` | `"The collectionFormat can only be applied to model property with type 'string[]'."` | "The collectionFormat can only be applied to model property with type 'string[]'." |
| `invalid-schema` | `Object` | - |
| `invalid-schema.default` | `CallableMessage`<[`"type"`]\> | - |
| `missing-path-param` | `Object` | - |
| `missing-path-param.default` | `CallableMessage`<[`"param"`]\> | - |
| `non-recommended-collection-format` | `Object` | - |
| `non-recommended-collection-format.default` | `"The recommendation of collection format are 'csv' and 'multi'."` | "The recommendation of collection format are 'csv' and 'multi'." |
| `nonspecific-scalar` | `Object` | - |
| `nonspecific-scalar.default` | `CallableMessage`<[`"type"`, `"chosenType"`]\> | - |
| `resource-namespace` | `Object` | - |
| `resource-namespace.default` | `"Resource goes on namespace"` | "Resource goes on namespace" |
| `security-service-namespace` | `Object` | - |
| `security-service-namespace.default` | `"Cannot add security details to a namespace other than the service namespace."` | "Cannot add security details to a namespace other than the service namespace." |
| `union-null` | `Object` | - |
| `union-null.default` | `"Cannot have a union containing only null types."` | "Cannot have a union containing only null types." |
| `union-unsupported` | `Object` | - |
| `union-unsupported.default` | `"Unions cannot be emitted to OpenAPI v2 unless all options are literals of the same type."` | "Unions cannot be emitted to OpenAPI v2 unless all options are literals of the same type." |
| `union-unsupported.empty` | `"Empty unions are not supported for OpenAPI v2 - enums must have at least one value."` | "Empty unions are not supported for OpenAPI v2 - enums must have at least one value." |
| `unsupported-auth` | `Object` | - |
| `unsupported-auth.default` | `CallableMessage`<[`"authType"`]\> | - |
| `unsupported-http-auth-scheme` | `Object` | - |
| `unsupported-http-auth-scheme.default` | `CallableMessage`<[`"scheme"`]\> | - |
| `unsupported-multipart-type` | `Object` | - |
| `unsupported-multipart-type.default` | `CallableMessage`<[`"part"`]\> | - |
| `unsupported-param-type` | `Object` | - |
| `unsupported-param-type.default` | `CallableMessage`<[`"part"`]\> | - |
| `unsupported-status-code-range` | `Object` | - |
| `unsupported-status-code-range.default` | `CallableMessage`<[`"start"`, `"end"`]\> | - |
