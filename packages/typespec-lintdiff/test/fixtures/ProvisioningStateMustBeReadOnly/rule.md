---
validatorRuleId: ProvisioningStateMustBeReadOnly
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state'
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state'
---

# ProvisioningStateMustBeReadOnly

**RPC Code:** RPC-Async-V1-16

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Validates that the `provisioningState` property in resource models is marked as `readOnly`.
The provisioning state is a system-managed property that should not be settable by clients.

## Detection Logic

The rule inspects each definition's `properties` object:

1. If a `provisioningState` property exists, it must have `readOnly: true`.
2. If `readOnly` is missing or set to `false` → error.

## Test Cases

| ID                               | Violation              | Description                                                      |
| -------------------------------- | ---------------------- | ---------------------------------------------------------------- |
| `provisioning-state-not-readonly`| Not read-only          | provisioningState is defined without @visibility("read")         |
