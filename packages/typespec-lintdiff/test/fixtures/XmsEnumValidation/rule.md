---
validatorRuleId: XmsEnumValidation
engine: native
tspLints: []
---

# XmsEnumValidation

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Native

## Description

Enum types should have x-ms-enum extension with appropriate options.
TypeSpec enums and unions automatically include x-ms-enum in swagger output.

## Test Cases

| ID                     | Violation | Description                                           |
| ---------------------- | --------- | ----------------------------------------------------- |
| `missing-xms-enum`     | false     | TypeSpec enums produce x-ms-enum automatically        |
