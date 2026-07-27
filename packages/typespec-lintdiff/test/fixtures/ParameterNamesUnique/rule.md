---
validatorRuleId: ParameterNamesUnique
engine: spectral
tspLints: []
---

# ParameterNamesUnique

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

All parameter names for an operation should be case-insensitive unique.
TypeSpec prevents duplicate parameter names at compile time.

## Test Cases

| ID                       | Violation | Description                                          |
| ------------------------ | --------- | ---------------------------------------------------- |
| `duplicate-param-names`  | false     | TypeSpec prevents duplicate parameter names          |
