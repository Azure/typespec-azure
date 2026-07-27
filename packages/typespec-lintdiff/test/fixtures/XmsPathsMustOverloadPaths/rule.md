---
validatorRuleId: XmsPathsMustOverloadPaths
engine: spectral
tspLints: []
---

# XmsPathsMustOverloadPaths

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

x-ms-paths must overload existing paths. TypeSpec does not emit x-ms-paths,
so this rule cannot be violated.

## Test Cases

| ID                          | Violation | Description                                       |
| --------------------------- | --------- | ------------------------------------------------- |
| `xms-path-no-overload`      | false     | TypeSpec does not emit x-ms-paths                 |
