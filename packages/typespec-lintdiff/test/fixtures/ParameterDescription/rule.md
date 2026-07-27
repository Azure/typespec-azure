---
validatorRuleId: ParameterDescription
engine: spectral
tspLints:
  - "@azure-tools/typespec-azure-core/documentation-required"
---

# ParameterDescription

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Validates that all parameters (path, query, header, body) have a `description` field.
Parameters without descriptions are harder to understand for API consumers.

## Detection Logic

The rule inspects each parameter in each operation:

1. If a parameter is missing a `description` → warning.

## Test Cases

| ID                          | Violation             | Description                                           |
| --------------------------- | --------------------- | ----------------------------------------------------- |
| `param-missing-description` | No description        | Path parameter defined without @doc decorator         |
