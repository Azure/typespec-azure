---
validatorRuleId: Nullable
engine: spectral
tspLints: []
---

# Nullable

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Validates that schemas do not use the `x-nullable` extension. The `x-nullable` extension is
deprecated in favor of proper nullable type handling.

## Detection Logic

The rule inspects each schema property:

1. If a property has `x-nullable: true` → warning.

## Test Cases

| ID                 | Violation      | Description                                                   |
| ------------------ | -------------- | ------------------------------------------------------------- |
| `x-nullable-used`  | x-nullable     | Property uses @extension("x-nullable", true)                  |
