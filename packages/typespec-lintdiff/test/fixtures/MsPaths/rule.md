---
validatorRuleId: MsPaths
engine: spectral
tspLints: []
---

# MsPaths

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

x-ms-paths should not be used except for legacy API support. TypeSpec does not
emit x-ms-paths.

## Test Cases

| ID                 | Violation | Description                                   |
| ------------------ | --------- | --------------------------------------------- |
| `using-xms-paths`  | false     | TypeSpec does not emit x-ms-paths             |
