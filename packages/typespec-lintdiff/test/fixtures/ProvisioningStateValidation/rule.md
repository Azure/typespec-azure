---
validatorRuleId: ProvisioningStateValidation
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state'
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state'
---

# ProvisioningStateValidation

**RPC Code:** RPC-Async-V1-03

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Validates that the `provisioningState` property enum includes the required terminal states:
`Succeeded`, `Failed`, and `Canceled`. These terminal states are essential for ARM to
determine the final outcome of long-running operations.

## Detection Logic

The upstream validator inspects OpenAPI definitions for an inline `provisioningState`/`ProvisioningState`
schema that directly carries an `enum` array:

1. If a `provisioningState` property exists with an inline enum, it must include
   `Succeeded`, `Failed`, and `Canceled` values.
2. If any required terminal state is missing → error.

## Source-of-truth notes

- Upstream `azure-openapi-validator` registers this as an ARM Spectral error on
  `$.definitions..provisioningState[?(@property === 'enum')]^` and the matching
  `ProvisioningState` variant.
- The Spectral function is case-insensitive and only checks for the three required terminal states.
- Upstream tests cover one violating inline enum and one compliant inline enum.

## Current outcome

- The previous local fixture was a **test-quality issue**: it used a named TypeSpec union that emitted
  `provisioningState` as a `$ref`, so the upstream selector never visited the enum and the validator
  stayed silent.
- The corrected fixture keeps the missing terminal states inline on
  `WidgetProperties.properties.provisioningState`, which reproduces the validator rule locally.
- With that fix, both the validator and
  `@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state` fire on the same
  case, so the current migration classification is **already covered**. No local native lint code is
  needed.

## Test Cases

| ID                       | Violation                | Description                                                     |
| ------------------------ | ------------------------ | --------------------------------------------------------------- |
| `missing-terminal-states`| Missing "Succeeded"      | Inline provisioningState enum has Creating, Failed, Canceled but not Succeeded |
