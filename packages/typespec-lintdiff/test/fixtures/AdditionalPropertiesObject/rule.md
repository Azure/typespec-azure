---
validatorRuleId: AdditionalPropertiesObject
engine: spectral
tspLints: []
---

# AdditionalPropertiesObject

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Validates that `additionalProperties` does not use `type: object` without
further constraining properties. Using bare `type: object` for
`additionalProperties` prevents SDK code generators from producing
strongly-typed models.

## Detection Logic

The rule inspects each schema definition:

1. If `additionalProperties` is an object with `type: "object"` (and no
   further properties/allOf/etc.) → warning.

## Test Cases

| ID                              | Violation                              | Description                                                         |
| ------------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `additional-props-with-object`  | additionalProperties has type: object  | Model uses Record<object> producing additionalProperties type:object |
