---
validatorRuleId: ParameterDescriptionRequired
engine: native
tspLints: []
---

# ParameterDescriptionRequired

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Native

## Description

All parameters must have a description. Parameters without @doc decorator
will lack descriptions in the generated swagger, triggering this rule.

## Test Cases

| ID                            | Violation | Description                                            |
| ----------------------------- | --------- | ------------------------------------------------------ |
| `param-without-description`   | false     | All parameters have @doc decorators                    |
