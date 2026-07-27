---
validatorRuleId: ValidFormats
engine: spectral
tspLints: []
---

# ValidFormats

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Property formats must be valid OpenAPI formats. TypeSpec type system only
produces valid format values.

## Test Cases

| ID                 | Violation | Description                                      |
| ------------------ | --------- | ------------------------------------------------ |
| `invalid-format`   | false     | TypeSpec produces only valid format values        |
