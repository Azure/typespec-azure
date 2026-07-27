---
validatorRuleId: UniqueXmsEnumName
engine: native
tspLints: []
---

# UniqueXmsEnumName

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Native

## Description

x-ms-enum names must be unique across the swagger. TypeSpec enum types
produce unique x-ms-enum names from their TypeSpec type names.

## Test Cases

| ID                        | Violation | Description                                         |
| ------------------------- | --------- | --------------------------------------------------- |
| `duplicate-enum-name`     | false     | TypeSpec enums produce unique x-ms-enum names       |
