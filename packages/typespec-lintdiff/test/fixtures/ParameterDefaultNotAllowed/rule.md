---
validatorRuleId: ParameterDefaultNotAllowed
engine: spectral
tspLints: []
---

# ParameterDefaultNotAllowed

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

A required parameter should not specify a default value. TypeSpec does not
emit a default for required parameters.

## Test Cases

| ID                              | Violation | Description                                              |
| ------------------------------- | --------- | -------------------------------------------------------- |
| `required-param-with-default`   | false     | TypeSpec does not emit default for required parameters   |
