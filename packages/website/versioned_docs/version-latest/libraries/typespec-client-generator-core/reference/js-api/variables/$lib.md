---
jsApi: true
title: "[V] $lib"

---
```ts
const $lib: TypeSpecLibrary<object, Record<string, any>, never>;
```

## Type declaration

| Name | Type | Default value |
| ------ | ------ | ------ |
| `access` | `object` | - |
| `access.default` | "Access decorator value must be \"public\" or \"internal\"." | - |
| `client-name` | `object` | - |
| `client-name.default` | `CallableMessage`<[`"name"`]\> | - |
| `client-service` | `object` | - |
| `client-service.default` | `CallableMessage`<[`"name"`]\> | - |
| `conflict-access-override` | `object` | - |
| `conflict-access-override.default` | `"@access override conflicts with the access calculated from operation or other @access override."` | - |
| `conflict-usage-override` | `object` | - |
| `conflict-usage-override.default` | `"@usage override conflicts with the usage calculated from operation or other @usage override."` | - |
| `conflicting-multipart-model-usage` | `object` | - |
| `conflicting-multipart-model-usage.default` | `"Invalid encoding"` | "Invalid encoding" |
| `conflicting-multipart-model-usage.wrongType` | `CallableMessage`<[`"modelName"`, `"modelName"`, `"modelName"`]\> | - |
| `discriminator-not-constant` | `object` | - |
| `discriminator-not-constant.default` | `CallableMessage`<[`"discriminator"`]\> | - |
| `discriminator-not-string` | `object` | - |
| `discriminator-not-string.default` | `CallableMessage`<[`"discriminator"`, `"discriminatorValue"`]\> | - |
| `duplicate-client-name` | `object` | - |
| `duplicate-client-name.default` | `CallableMessage`<[`"name"`, `"scope"`]\> | - |
| `duplicate-client-name.nonDecorator` | `CallableMessage`<[`"name"`, `"scope"`]\> | - |
| `duplicate-example-file` | `object` | - |
| `duplicate-example-file.default` | `CallableMessage`<[`"filename"`, `"title"`, `"operationId"`]\> | - |
| `empty-client-name` | `object` | - |
| `empty-client-name.default` | `"Cannot pass an empty value to the @clientName decorator"` | - |
| `encoding-multipart-bytes` | `object` | - |
| `encoding-multipart-bytes.default` | `"Encoding should not be applied to bytes content in a multipart request. This is semi-incompatible with how multipart works in HTTP."` | "Encoding should not be applied to bytes content in a multipart request. This is semi-incompatible with how multipart works in HTTP." |
| `example-loading` | `object` | - |
| `example-loading.default` | `CallableMessage`<[`"filename"`, `"error"`]\> | - |
| `example-loading.noDirectory` | `CallableMessage`<[`"directory"`]\> | - |
| `example-loading.noOperationId` | `CallableMessage`<[`"filename"`]\> | - |
| `example-value-no-mapping` | `object` | - |
| `example-value-no-mapping.default` | `CallableMessage`<[`"relativePath"`, `"value"`]\> | - |
| `flatten-polymorphism` | `object` | - |
| `flatten-polymorphism.default` | `"Cannot flatten property of polymorphic type."` | - |
| `incorrect-client-format` | `object` | - |
| `incorrect-client-format.default` | `CallableMessage`<[`"format"`, `"expectedTargetTypes"`]\> | - |
| `invalid-encode` | `object` | - |
| `invalid-encode.default` | `"Invalid encoding"` | "Invalid encoding" |
| `invalid-encode.wrongType` | `CallableMessage`<[`"encoding"`, `"type"`]\> | - |
| `invalid-usage` | `object` | - |
| `invalid-usage.default` | "Usage decorator value must be 2 (\"input\") or 4 (\"output\")." | - |
| `multiple-response-types` | `object` | - |
| `multiple-response-types.default` | `CallableMessage`<[`"operation"`, `"response"`]\> | - |
| `multiple-services` | `object` | - |
| `multiple-services.default` | `CallableMessage`<[`"service"`]\> | - |
| `no-corresponding-method-param` | `object` | - |
| `no-corresponding-method-param.default` | `CallableMessage`<[`"paramName"`, `"methodName"`, `"paramName"`, `"paramName"`]\> | - |
| `no-emitter-name` | `object` | - |
| `no-emitter-name.default` | `"Can not find name for your emitter, please check your emitter name."` | "Can not find name for your emitter, please check your emitter name." |
| `override-method-parameters-mismatch` | `object` | - |
| `override-method-parameters-mismatch.default` | `CallableMessage`<[`"methodName"`, `"originalParameters"`, `"overrideParameters"`]\> | - |
| `server-param-not-path` | `object` | - |
| `server-param-not-path.default` | `CallableMessage`<[`"templateArgumentName"`, `"templateArgumentType"`]\> | - |
| `unexpected-http-param-type` | `object` | - |
| `unexpected-http-param-type.default` | `CallableMessage`<[`"paramName"`, `"expectedType"`, `"actualType"`]\> | - |
| `union-null` | `object` | - |
| `union-null.default` | `"Cannot have a union containing only null types."` | "Cannot have a union containing only null types." |
| `union-unsupported` | `object` | - |
| `union-unsupported.default` | `"Unions cannot be emitted by our language generators unless all options are literals of the same type."` | "Unions cannot be emitted by our language generators unless all options are literals of the same type." |
| `union-unsupported.null` | `"Unions containing multiple model types cannot be emitted unless the union is between one model type and 'null'."` | "Unions containing multiple model types cannot be emitted unless the union is between one model type and 'null'." |
| `unknown-client-format` | `object` | - |
| `unknown-client-format.default` | `CallableMessage`<[`"format"`, `"knownValues"`]\> | - |
| `unsupported-generic-decorator-arg-type` | `object` | - |
| `unsupported-generic-decorator-arg-type.default` | `CallableMessage`<[`"decoratorName"`]\> | - |
| `unsupported-kind` | `object` | - |
| `unsupported-kind.default` | `CallableMessage`<[`"kind"`]\> | - |
| `unsupported-protocol` | `object` | - |
| `unsupported-protocol.default` | `"Currently we only support HTTP and HTTPS protocols"` | "Currently we only support HTTP and HTTPS protocols" |
| `use-enum-instead` | `object` | - |
| `use-enum-instead.default` | `"Use enum instead of union of string or number literals. Falling back to the literal type."` | "Use enum instead of union of string or number literals. Falling back to the literal type." |
| `wrong-client-decorator` | `object` | - |
| `wrong-client-decorator.default` | `"@client or @operationGroup should decorate namespace or interface in client.tsp"` | "@client or @operationGroup should decorate namespace or interface in client.tsp" |
