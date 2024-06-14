---
jsApi: true
title: "[V] $lib"

---
```ts
const $lib: TypeSpecLibrary<object, Record<string, any>, never>;
```

## Type declaration

| Member | Type | Value |
| :------ | :------ | :------ |
| `access` | `object` | ... |
| `access.default` | `string` | ... |
| `client-name` | `object` | ... |
| `client-name.default` | `CallableMessage`<[`string`]\> | ... |
| `client-service` | `object` | ... |
| `client-service.default` | `CallableMessage`<[`string`]\> | ... |
| `conflicting-multipart-model-usage` | `object` | ... |
| `conflicting-multipart-model-usage.default` | `string` | "Invalid encoding" |
| `conflicting-multipart-model-usage.wrongType` | `CallableMessage`<[`string`, `string`, `string`]\> | ... |
| `discriminator-not-constant` | `object` | ... |
| `discriminator-not-constant.default` | `CallableMessage`<[`string`]\> | ... |
| `discriminator-not-string` | `object` | ... |
| `discriminator-not-string.default` | `CallableMessage`<[`string`, `string`]\> | ... |
| `encoding-multipart-bytes` | `object` | ... |
| `encoding-multipart-bytes.default` | `string` | "Encoding should not be applied to bytes content in a multipart request. This is semi-incompatible with how multipart works in HTTP." |
| `incorrect-client-format` | `object` | ... |
| `incorrect-client-format.default` | `CallableMessage`<[`string`, `string`]\> | ... |
| `invalid-encode` | `object` | ... |
| `invalid-encode.default` | `string` | "Invalid encoding" |
| `invalid-encode.wrongType` | `CallableMessage`<[`string`, `string`]\> | ... |
| `invalid-usage` | `object` | ... |
| `invalid-usage.default` | `string` | ... |
| `multiple-response-types` | `object` | ... |
| `multiple-response-types.default` | `CallableMessage`<[`string`, `string`]\> | ... |
| `multiple-services` | `object` | ... |
| `multiple-services.default` | `CallableMessage`<[`string`]\> | ... |
| `no-corresponding-method-param` | `object` | ... |
| `no-corresponding-method-param.default` | `string` | ... |
| `no-emitter-name` | `object` | ... |
| `no-emitter-name.default` | `CallableMessage`<[]\> | ... |
| `server-param-not-path` | `object` | ... |
| `server-param-not-path.default` | `CallableMessage`<[`string`, `string`]\> | ... |
| `unexpected-http-param-type` | `object` | ... |
| `unexpected-http-param-type.default` | `CallableMessage`<[`string`, `string`, `string`]\> | ... |
| `union-null` | `object` | ... |
| `union-null.default` | `string` | "Cannot have a union containing only null types." |
| `union-unsupported` | `object` | ... |
| `union-unsupported.default` | `string` | "Unions cannot be emitted by our language generators unless all options are literals of the same type." |
| `union-unsupported.null` | `string` | "Unions containing multiple model types cannot be emitted unless the union is between one model type and 'null'." |
| `unknown-client-format` | `object` | ... |
| `unknown-client-format.default` | `CallableMessage`<[`string`, `string`]\> | ... |
| `unsupported-kind` | `object` | ... |
| `unsupported-kind.default` | `CallableMessage`<[`string`]\> | ... |
| `unsupported-protocol` | `object` | ... |
| `unsupported-protocol.default` | `CallableMessage`<[]\> | ... |
| `use-enum-instead` | `object` | ... |
| `use-enum-instead.default` | `string` | "Use enum instead of union of string or number literals. Falling back to the literal type." |
| `wrong-client-decorator` | `object` | ... |
| `wrong-client-decorator.default` | `string` | "@client or @operationGroup should decorate namespace or interface in client.tsp" |
