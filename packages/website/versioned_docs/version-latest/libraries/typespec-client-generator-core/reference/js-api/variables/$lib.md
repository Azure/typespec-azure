---
jsApi: true
title: "[V] $lib"

---
```ts
const $lib: TypeSpecLibrary<Object, Record<string, any>, never>;
```

## Type declaration

| Member | Type | Value |
| :------ | :------ | :------ |
| `access` | `Object` | - |
| `access.default` | `string` | - |
| `client-name` | `Object` | - |
| `client-name.default` | `CallableMessage`<[`string`]\> | - |
| `client-service` | `Object` | - |
| `client-service.default` | `CallableMessage`<[`string`]\> | - |
| `conflicting-multipart-model-usage` | `Object` | - |
| `conflicting-multipart-model-usage.default` | `string` | "Invalid encoding" |
| `conflicting-multipart-model-usage.wrongType` | `CallableMessage`<[`string`, `string`, `string`]\> | - |
| `discriminator-not-constant` | `Object` | - |
| `discriminator-not-constant.default` | `CallableMessage`<[`string`]\> | - |
| `discriminator-not-string` | `Object` | - |
| `discriminator-not-string.default` | `CallableMessage`<[`string`, `string`]\> | - |
| `encoding-multipart-bytes` | `Object` | - |
| `encoding-multipart-bytes.default` | `string` | "Encoding should not be applied to bytes content in a multipart request. This is semi-incompatible with how multipart works in HTTP." |
| `incorrect-client-format` | `Object` | - |
| `incorrect-client-format.default` | `CallableMessage`<[`string`, `string`]\> | - |
| `invalid-encode` | `Object` | - |
| `invalid-encode.default` | `string` | "Invalid encoding" |
| `invalid-encode.wrongType` | `CallableMessage`<[`string`, `string`]\> | - |
| `invalid-usage` | `Object` | - |
| `invalid-usage.default` | `string` | - |
| `multiple-services` | `Object` | - |
| `multiple-services.default` | `CallableMessage`<[`string`]\> | - |
| `server-param-not-path` | `Object` | - |
| `server-param-not-path.default` | `CallableMessage`<[`string`, `string`]\> | - |
| `union-null` | `Object` | - |
| `union-null.default` | `string` | "Cannot have a union containing only null types." |
| `union-unsupported` | `Object` | - |
| `union-unsupported.default` | `string` | "Unions cannot be emitted by our language generators unless all options are literals of the same type." |
| `union-unsupported.null` | `string` | "Unions containing multiple model types cannot be emitted unless the union is between one model type and 'null'." |
| `unknown-client-format` | `Object` | - |
| `unknown-client-format.default` | `CallableMessage`<[`string`, `string`]\> | - |
| `unsupported-kind` | `Object` | - |
| `unsupported-kind.default` | `CallableMessage`<[`string`]\> | - |
| `use-enum-instead` | `Object` | - |
| `use-enum-instead.default` | `string` | "Use enum instead of union of string or number literals. Falling back to the literal type." |
| `wrong-client-decorator` | `Object` | - |
| `wrong-client-decorator.default` | `string` | "@client or @operationGroup should decorate namespace or interface in client.tsp" |
