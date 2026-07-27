---
validatorRuleId: PrivateEndpointResourceSchemaValidation
engine: native
tspLints: []
---

# PrivateEndpointResourceSchemaValidation

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Native

## Description

Private endpoint resource schemas must conform to common type definitions.
This rule only applies when private endpoint models are present. A standard
ARM service without private endpoint models does not trigger this rule.

## Test Cases

| ID                            | Violation | Description                                            |
| ----------------------------- | --------- | ------------------------------------------------------ |
| `invalid-private-endpoint`    | false     | Standard ARM service without private endpoint models   |
