---
validatorRuleId: EnumInsteadOfBoolean
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/enum-instead-of-boolean
---

# EnumInsteadOfBoolean

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Boolean properties are not descriptive in all cases and can make them hard to use.
Evaluate whether it makes sense to keep the property as boolean or turn it into an enum.

## Semantic coverage notes

The upstream rule is broad: it flags any OpenAPI schema object whose `type` is `boolean`, including
model properties, parameters, request bodies, and response bodies. The local suite now covers each
of those authorable TypeSpec surfaces plus a compliant control case.

## Test Cases

| ID                     | Violation | Description                                      |
| ---------------------- | --------- | ------------------------------------------------ |
| `boolean-property`     | true      | Model with a boolean property                    |
| `boolean-path-param`   | true      | Operation path parameter is boolean              |
| `boolean-body`         | true      | Request body is typed as boolean                 |
| `boolean-response`     | true      | Response body is typed as boolean                |
| `non-boolean-shapes`   | false     | Comparable shapes use string instead of boolean  |
