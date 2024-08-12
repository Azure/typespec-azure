---
jsApi: true
title: "[V] $lib"

---
```ts
const $lib: TypeSpecLibrary<object, Record<string, any>, 
  | "fixed"
  | "items"
  | "trait"
  | "pagedResult"
  | "nextLink"
  | "lroStatus"
  | "lroSucceeded"
  | "lroCanceled"
  | "lroFailed"
  | "lroResult"
  | "lroErrorResult"
  | "pollingOperationParameter"
  | "pollingLocationInfo"
  | "finalLocations"
  | "finalLocationResults"
  | "finalStateOverride"
  | "needsRoute"
  | "ensureVerb"
  | "embeddingVector"
  | "armResourceIdentifierConfig"
  | "operationLink"
  | "requestParameter"
  | "responseParameter"
  | "resourceOperation"
  | "traitSource"
  | "traitContext"
| "traitLocation">;
```

## Type declaration

| Name | Type | Default value |
| ------ | ------ | ------ |
| `bad-record-type` | `object` | - |
| `bad-record-type.extendUnknown` | `CallableMessage`<[`"name"`, `"keyword"`, `"typeName"`, `"keyword"`]\> | - |
| `bad-record-type.recordWithProperties` | `CallableMessage`<[`"name"`, `"keyword"`, `"typeName"`]\> | - |
| `client-request-id-trait-missing` | `object` | - |
| `client-request-id-trait-missing.default` | `CallableMessage`<[]\> | - |
| `conditional-requests-trait-missing` | `object` | - |
| `conditional-requests-trait-missing.default` | `CallableMessage`<[]\> | - |
| `expected-success-response` | `object` | - |
| `expected-success-response.default` | `"The operation must have a success response"` | "The operation must have a success response" |
| `expected-trait-diagnostic-missing` | `object` | - |
| `expected-trait-diagnostic-missing.default` | "Expected trait entries must have a \"diagnostic\" field with a valid diagnostic code for the missing trait." | - |
| `expected-trait-missing` | `object` | - |
| `expected-trait-missing.default` | `CallableMessage`<[`"trait"`, `"message"`]\> | - |
| `invalid-final-operation` | `object` | - |
| `invalid-final-operation.default` | `"The operation linked in the '@finalOperation' decorator must have a 200 response that includes a model."` | "The operation linked in the '@finalOperation' decorator must have a 200 response that includes a model." |
| `invalid-final-state` | `object` | - |
| `invalid-final-state.badValue` | `CallableMessage`<[`"finalStateValue"`]\> | - |
| `invalid-final-state.noHeader` | `CallableMessage`<[`"finalStateValue"`]\> | - |
| `invalid-final-state.notPut` | `"The final state value 'original-uri' can only be used in http PUT operations"` | "The final state value 'original-uri' can only be used in http PUT operations" |
| `invalid-parameter` | `object` | - |
| `invalid-parameter.default` | `CallableMessage`<[`"propertyName"`, `"kind"`]\> | - |
| `invalid-resource-type` | `object` | - |
| `invalid-resource-type.missingKey` | `CallableMessage`<[`"name"`]\> | - |
| `invalid-resource-type.missingSegment` | `CallableMessage`<[`"name"`]\> | - |
| `invalid-trait-context` | `object` | - |
| `invalid-trait-context.default` | "The trait context can only be an enum member, union of enum members, or \`unknown\`." | "The trait context can only be an enum member, union of enum members, or \`unknown\`." |
| `invalid-trait-property-count` | `object` | - |
| `invalid-trait-property-count.default` | `CallableMessage`<[`"modelName"`]\> | - |
| `invalid-trait-property-type` | `object` | - |
| `invalid-trait-property-type.default` | `CallableMessage`<[`"modelName"`, `"propertyName"`]\> | - |
| `lro-polling-data-missing-from-operation-response` | `object` | - |
| `lro-polling-data-missing-from-operation-response.default` | "At least one operation response must contain a field marked with \`@lroStatus\`" | "At least one operation response must contain a field marked with \`@lroStatus\`" |
| `lro-status-missing` | `object` | - |
| `lro-status-missing.default` | `CallableMessage`<[`"states"`]\> | - |
| `lro-status-monitor-invalid-result-property` | `object` | - |
| `lro-status-monitor-invalid-result-property.default` | `CallableMessage`<[`"resultType"`, `"decorator"`]\> | - |
| `lro-status-property-invalid-type` | `object` | - |
| `lro-status-property-invalid-type.default` | `"Property type must be a union of strings or an enum."` | "Property type must be a union of strings or an enum." |
| `lro-status-union-non-string` | `object` | - |
| `lro-status-union-non-string.default` | `CallableMessage`<[`"type"`]\> | - |
| `no-object` | `object` | - |
| `no-object.default` | "Don't use 'object'.\n - If you want an object with any properties, use \`Record<unknown\>\`\n - If you meant anything, use \`unknown\`." | "Don't use 'object'.\n - If you want an object with any properties, use \`Record<unknown\>\`\n - If you meant anything, use \`unknown\`." |
| `operation-link-parameter-invalid` | `object` | - |
| `operation-link-parameter-invalid.default` | `"Parameters must be of template type RequestParameter<T> or ResponseProperty<T>."` | "Parameters must be of template type RequestParameter<T\> or ResponseProperty<T\>." |
| `operation-link-parameter-invalid-target` | `object` | - |
| `operation-link-parameter-invalid-target.default` | `CallableMessage`<[`"name"`]\> | - |
| `polling-operation-no-lro-failure` | `object` | - |
| `polling-operation-no-lro-failure.default` | `"The status monitor returned from the polling operation must have a status property, with a known status value the indicates failure. This known value may be named 'Failed' or marked with the '@lroFailed' decorator."` | "The status monitor returned from the polling operation must have a status property, with a known status value the indicates failure. This known value may be named 'Failed' or marked with the '@lroFailed' decorator." |
| `polling-operation-no-lro-success` | `object` | - |
| `polling-operation-no-lro-success.default` | `"The status monitor returned from the polling operation must have a status property, with a known status value the indicates successful completion. This known value may be named 'Succeeded' or marked with the '@lroSucceeded' decorator."` | "The status monitor returned from the polling operation must have a status property, with a known status value the indicates successful completion. This known value may be named 'Succeeded' or marked with the '@lroSucceeded' decorator." |
| `polling-operation-no-ref-or-link` | `object` | - |
| `polling-operation-no-ref-or-link.default` | `"An operation decorated with '@pollingOperation' must either return a response with an 'Operation-Location' header that will contain a runtime link to the polling operation, or specify parameters and return type properties to map into the polling operation parameters. A map into polling operation parameters can be created using the '@pollingOperationParameter' decorator"` | "An operation decorated with '@pollingOperation' must either return a response with an 'Operation-Location' header that will contain a runtime link to the polling operation, or specify parameters and return type properties to map into the polling operation parameters. A map into polling operation parameters can be created using the '@pollingOperationParameter' decorator" |
| `polling-operation-no-status-monitor` | `object` | - |
| `polling-operation-no-status-monitor.default` | `"The operation linked in @pollingOperation must return a valid status monitor. The status monitor model must contain a 'status' property, or a property decorated with '@lroStatus'. The status field must be of Enum or Union type and contain terminal status values for success and failure."` | "The operation linked in @pollingOperation must return a valid status monitor. The status monitor model must contain a 'status' property, or a property decorated with '@lroStatus'. The status field must be of Enum or Union type and contain terminal status values for success and failure." |
| `polling-operation-return-model` | `object` | - |
| `polling-operation-return-model.default` | `"An operation annotated with @pollingOperation must return a model or union of model."` | "An operation annotated with @pollingOperation must return a model or union of model." |
| `repeatable-requests-trait-missing` | `object` | - |
| `repeatable-requests-trait-missing.default` | `CallableMessage`<[]\> | - |
| `request-parameter-invalid` | `object` | - |
| `request-parameter-invalid.default` | `CallableMessage`<[`"name"`]\> | - |
| `response-property-invalid` | `object` | - |
| `response-property-invalid.default` | `CallableMessage`<[`"name"`]\> | - |
| `rpc-operation-needs-route` | `object` | - |
| `rpc-operation-needs-route.default` | `"The operation needs a @route"` | "The operation needs a @route" |
| `trait-property-without-location` | `object` | - |
| `trait-property-without-location.default` | `CallableMessage`<[`"modelName"`, `"propertyName"`]\> | - |
| `union-enums-circular` | `object` | - |
| `union-enums-circular.default` | `"Union is referencing itself and cannot be resolved as an enum."` | - |
| `union-enums-invalid-kind` | `object` | - |
| `union-enums-invalid-kind.default` | `CallableMessage`<[`"kind"`]\> | - |
| `union-enums-multiple-kind` | `object` | - |
| `union-enums-multiple-kind.default` | `CallableMessage`<[`"kinds"`]\> | - |
| `verb-conflict` | `object` | - |
| `verb-conflict.default` | `CallableMessage`<[`"templateName"`, `"requiredVerb"`, `"verb"`]\> | - |
