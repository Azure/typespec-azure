---
validatorRuleId: PropertyDescription
engine: spectral
tspLints:
  - "@azure-tools/typespec-azure-core/documentation-required"
---

# PropertyDescription

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Validates that all properties in schema definitions have a `description` field.
Properties without descriptions are harder for API consumers to understand.

## Detection Logic

The rule inspects each property in each schema definition:

1. If a property is missing a `description` → warning.

## Test Cases

| ID                             | Violation       | Description                                                 |
| ------------------------------ | --------------- | ----------------------------------------------------------- |
| `property-missing-description` | No description  | Model properties defined without @doc decorator             |
