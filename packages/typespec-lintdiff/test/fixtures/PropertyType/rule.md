---
validatorRuleId: PropertyType
engine: spectral
tspLints: []
---

# PropertyType

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

All schema properties should have a defined type. TypeSpec always emits typed
properties from its type system.

## Test Cases

| ID                        | Violation | Description                                        |
| ------------------------- | --------- | -------------------------------------------------- |
| `property-without-type`   | false     | TypeSpec always emits typed properties              |
