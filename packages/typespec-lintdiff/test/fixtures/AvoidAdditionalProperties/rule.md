---
validatorRuleId: AvoidAdditionalProperties
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-no-record'
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-no-record'
---

# AvoidAdditionalProperties

**RPC Code:** RPC-Policy-V1-05, RPC-Put-V1-23

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Validates that resource definitions do not use `additionalProperties`. ARM resources should
have a well-defined schema and should not allow arbitrary additional properties. Using
`Record<T>` in TypeSpec generates `additionalProperties` in the swagger output.

## Detection Logic

The rule inspects each definition's properties:

1. If any property has `additionalProperties` → error.
2. If the definition itself has `additionalProperties` → error.

## Test Cases

| ID                        | Violation                 | Description                                                     |
| ------------------------- | ------------------------- | --------------------------------------------------------------- |
| `record-type-in-resource` | additionalProperties used | Resource properties bag has a Record<string> field               |
