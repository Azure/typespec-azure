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
- unbased custom scalars and empty enums should pass because AutoRest emits no schema `type`
- scalar encodings that add an emitted schema type should violate
- an encoded model-property body backed by a referenced schema should follow the resolved schema;
  the unbased scalar control passes because that definition has no non-object `type`
- an encoded model-property body backed by an inline schema should violate because the encoding
  replaces the inline schema type
- file bodies should violate, while multipart bodies should pass because their parts emit as form-data parameters
- schemas without a `type` property are ignored by the validator
- object body schemas should pass
- referenced object models should pass

## Emission matrix

The Swagger selector depends on whether AutoRest emits `schema.type`, so surface coverage alone is
not sufficient. The matrix below covers each reachable request-body emission category.

| Authored TypeSpec shape                                                                                                                       | AutoRest result                                                   | Expected rule result | Fixture                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------- | -------------------------------------------------- |
| no body or `void` placeholder                                                                                                                 | no body schema                                                    | pass                 | `no-body-action`                                   |
| multipart body                                                                                                                                | form-data parameters without body schemas                         | pass                 | `multipart-body`                                   |
| file body                                                                                                                                     | `type: string`, `format: binary`                                  | violate              | `explicit-schema-type-bodies`                      |
| intrinsic schema-less type                                                                                                                    | schema without `type`                                             | pass                 | `unknown-body-action`                              |
| object model, including inline object                                                                                                         | `type: object` or resolved object reference                       | pass                 | `object-body`, `inline-object-body`                |
| array model, including transformed named array ancestry                                                                                       | `type: array`                                                     | violate              | `named-array-model-body`                           |
| standard or standard-based scalar                                                                                                             | explicit primitive `type`                                         | violate              | `non-object-body`, `explicit-schema-type-bodies`   |
| unbased custom scalar without an effective emitted encoding format, or a based scalar whose encoding replaces its type with an untyped scalar | schema without `type`                                             | pass                 | `unbased-scalar-body`, `empty-encoded-scalar-body` |
| encoded scalar chain that resolves to a typed schema, including an unsupported format whose encode-as scalar has a type                       | explicit primitive `type`                                         | violate              | `explicit-schema-type-bodies`                      |
| encoded model property backed by an inline schema                                                                                             | encoding replaces the inline schema `type`                        | violate              | `explicit-schema-type-bodies`                      |
| encoded model property backed by a referenced scalar or named union, including nullable wrappers                                              | `$ref` plus sibling encoded type; validator follows the reference | follow resolved type | `encoded-model-property-body`                      |
| non-empty enum                                                                                                                                | explicit string or number `type`                                  | violate              | `explicit-schema-type-bodies`                      |
| empty enum                                                                                                                                    | schema without `type`                                             | pass                 | `empty-enum-body`                                  |
| union with one effective non-null variant                                                                                                     | effective variant schema                                          | follow variant       | `nullable-object-body`, `single-variant-unions`    |
| enum-convertible multi-variant union                                                                                                          | explicit string or number `type`                                  | violate              | `enum-union-body`                                  |
| unsupported multi-variant union                                                                                                               | schema without `type`                                             | pass                 | `unsupported-union-body`                           |
| literal, top-level string template, enum member, literal union variant, or tuple                                                              | explicit primitive or array `type`                                | violate              | `explicit-schema-type-bodies`                      |

The local suite also covers violations across POST and PUT and compliant object bodies with both
named-model and inline-object authoring.

An explicitly referenced union variant backed by a string template follows
AutoRest's nested `getSchemaForType` path, which rejects the schema before
Swagger validation. That emitter-invalid shape is outside the successfully
emitted comparison population; the TypeSpec rule does not add a second
diagnostic for it.

| ID                            | Violation | Description                                                                                                                                                                                      |
| ----------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `non-object-body`             | true      | POST body parameter is typed as a non-object type                                                                                                                                                |
| `put-non-object-body`         | true      | PUT body parameter is typed as a non-object type                                                                                                                                                 |
| `named-array-model-body`      | true      | Body parameter uses a named model extending an array                                                                                                                                             |
| `object-body`                 | false     | Body parameter uses an object model                                                                                                                                                              |
| `inline-object-body`          | false     | Body parameter uses an inline object shape                                                                                                                                                       |
| `nullable-object-body`        | false     | Nullable body resolves to a named object model                                                                                                                                                   |
| `single-variant-unions`       | false     | Singleton object and nullable unknown union bodies                                                                                                                                               |
| `unsupported-union-body`      | false     | Unsupported model union emits an untyped schema                                                                                                                                                  |
| `enum-union-body`             | true      | String enum union emits a non-object schema type                                                                                                                                                 |
| `unbased-scalar-body`         | false     | Unbased custom scalar and based scalar encoded as an untyped scalar emit untyped schemas                                                                                                         |
| `empty-enum-body`             | false     | Empty enum emits an untyped schema                                                                                                                                                               |
| `empty-encoded-scalar-body`   | false     | Empty encoding to unformatted `string`, or to an untyped secret wire scalar, does not add a schema type                                                                                          |
| `encoded-model-property-body` | false     | Validator resolution hides the encoded type beside a scalar `$ref`                                                                                                                               |
| `multipart-body`              | false     | Multipart parts emit without a body schema                                                                                                                                                       |
| `explicit-schema-type-bodies` | true      | Scalar, direct, nested, or inline-property encoding (including supported and unsupported formats), file, enum, member, variant, tuple, literal, and string-template bodies emit non-object types |
| `no-body-action`              | false     | ARM action has no request body                                                                                                                                                                   |
| `unknown-body-action`         | false     | Unknown body emits a schema without a `type` property                                                                                                                                            |
