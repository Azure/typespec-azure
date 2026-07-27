---
validatorRuleId: AdditionalPropertiesAndProperties
engine: spectral
tspLints:
  - "@azure-tools/typespec-azure-core/bad-record-type"
---

# AdditionalPropertiesAndProperties

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Validates that schema definitions do not combine named `properties` with
`additionalProperties`. Having both makes the schema harder to understand and
can cause issues with SDK code generation.

## Detection Logic

The rule inspects each schema definition:

1. If the schema has both `properties` and `additionalProperties` → warning.

## Test Cases

| ID                            | Violation                             | Description                                              |
| ----------------------------- | ------------------------------------- | -------------------------------------------------------- |
| `properties-with-additional`  | Properties + additionalProperties     | Model extends Record<string> while having named properties |
