---
validatorRuleId: SchemaDescriptionOrTitle
engine: spectral
tspLints:
  - "@azure-tools/typespec-azure-core/documentation-required"
---

# SchemaDescriptionOrTitle

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Validates that all schema definitions have either a `description` or `title` field.
Schemas without descriptions make generated documentation and SDKs harder to use.

## Detection Logic

The rule inspects each schema definition:

1. If neither `description` nor `title` is present → warning.

## Test Cases

| ID                          | Violation              | Description                                             |
| --------------------------- | ---------------------- | ------------------------------------------------------- |
| `schema-missing-description`| No description/title   | Model defined without @doc decorator                    |
