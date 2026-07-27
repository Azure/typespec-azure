---
validatorRuleId: DefaultInEnum
engine: spectral
tspLints: []
---

# DefaultInEnum

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

This rule applies when the value specified by the default property does not appear in the enum constraint for a schema.

## Test Cases

| ID                   | Violation | Description                                        |
| -------------------- | --------- | -------------------------------------------------- |
| `default-not-in-enum`| false     | Enum with a valid default value (compliant)        |
