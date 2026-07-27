---
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-core/casing-style'
validatorRuleId: DefinitionsPropertiesNamesCamelCase
---

# DefinitionsPropertiesNamesCamelCase

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Property names in model definitions must use camelCase. PascalCase, snake_case, or other
naming conventions are not allowed.

## Test Cases

| ID                    | Violation | Description                                                |
| --------------------- | --------- | ---------------------------------------------------------- |
| `pascal-case-property` | yes       | Resource property uses PascalCase name instead of camelCase |
