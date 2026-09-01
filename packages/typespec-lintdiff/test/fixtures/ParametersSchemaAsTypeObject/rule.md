---
validatorRuleId: ParametersSchemaAsTypeObject
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/parameters-schema-as-type-object
---

# ParametersSchemaAsTypeObject

**Severity:** error

**Applies to:** Resource Manager (ARM)

Body parameters must be typed as object. Non-object body schemas are not allowed.

## Semantic coverage notes

The upstream rule matrix is small:

- non-object body schemas should violate
- named models that extend arrays should violate
- nullable object body schemas should pass because nullability does not change the emitted object schema type
- single-effective-variant object and unknown unions should follow the emitted variant schema
- unsupported multi-model unions should pass because AutoRest emits no schema `type`
- unions emitted as string or number enums should violate
- schemas without a `type` property are ignored by the validator
- object body schemas should pass
- referenced object models should pass

The local suite covers the violating case across more than one verb and covers compliant object
bodies with both named-model and inline-object authoring.

| ID                       | Violation | Description                                           |
| ------------------------ | --------- | ----------------------------------------------------- |
| `non-object-body`        | true      | POST body parameter is typed as a non-object type     |
| `put-non-object-body`    | true      | PUT body parameter is typed as a non-object type      |
| `named-array-model-body` | true      | Body parameter uses a named model extending an array  |
| `object-body`            | false     | Body parameter uses an object model                   |
| `inline-object-body`     | false     | Body parameter uses an inline object shape            |
| `nullable-object-body`   | false     | Nullable body resolves to a named object model        |
| `single-variant-unions`  | false     | Singleton object and nullable unknown union bodies    |
| `unsupported-union-body` | false     | Unsupported model union emits an untyped schema       |
| `enum-union-body`        | true      | String enum union emits a non-object schema type      |
| `no-body-action`         | false     | ARM action has no request body                        |
| `unknown-body-action`    | false     | Unknown body emits a schema without a `type` property |
