---
validatorRuleId: SchemaTypeAndFormat
engine: spectral
tspLints: []
---

# SchemaTypeAndFormat

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Schema types must use well-defined type/format combinations. TypeSpec's type
system maps to valid OpenAPI type/format combinations.

## Test Cases

| ID                        | Violation | Description                                         |
| ------------------------- | --------- | --------------------------------------------------- |
| `invalid-type-format`     | false     | TypeSpec produces valid type/format combinations    |
