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
- object body schemas should pass
- referenced object models should pass

The local suite covers the violating case across more than one verb and covers compliant object
bodies with both named-model and inline-object authoring.

| ID                  | Violation | Description                                       |
| ------------------- | --------- | ------------------------------------------------- |
| `non-object-body`   | true      | POST body parameter is typed as a non-object type |
| `put-non-object-body` | true    | PUT body parameter is typed as a non-object type  |
| `object-body`       | false     | Body parameter uses an object model               |
| `inline-object-body` | false    | Body parameter uses an inline object shape        |
