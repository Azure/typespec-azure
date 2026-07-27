---
engine: native
tspLints:
- '@azure-tools/typespec-azure-resource-manager/missing-x-ms-identifiers'
validatorRuleId: XmsIdentifierValidation
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/missing-x-ms-identifiers'
---

# XmsIdentifierValidation

**Severity:** warning

**Applies to:** Resource Manager (ARM)

**Rule engine:** Native

## Description

Array properties of objects should have x-ms-identifiers set. TypeSpec autorest
emitter automatically adds x-ms-identifiers for array properties of models.

## Test Cases

| ID                        | Violation | Description                                              |
| ------------------------- | --------- | -------------------------------------------------------- |
| `missing-identifiers`     | false     | TypeSpec autorest emitter adds x-ms-identifiers          |
