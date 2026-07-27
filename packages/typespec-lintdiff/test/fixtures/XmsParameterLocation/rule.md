---
validatorRuleId: XmsParameterLocation
engine: spectral
tspLints: []
---

# XmsParameterLocation

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Validates that global/shared parameters (defined in the top-level `parameters`
section of the Swagger) have an `x-ms-parameter-location` extension. TypeSpec
typically inlines parameters rather than placing them in the global section,
so standard TypeSpec output is generally compliant.

## Detection Logic

The rule inspects each parameter in the top-level `parameters` section:

1. If the parameter does not have `x-ms-parameter-location` → warning.

## Test Cases

| ID                  | Violation | Description                                                     |
| ------------------- | --------- | --------------------------------------------------------------- |
| `inline-parameters` | false     | Parameters are inlined in the operation, no global parameters   |
