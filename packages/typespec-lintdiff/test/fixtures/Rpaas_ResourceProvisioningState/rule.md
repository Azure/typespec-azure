---
validatorRuleId: Rpaas_ResourceProvisioningState
engine: native
tspLints: []
---

# Rpaas_ResourceProvisioningState

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Native

## Description

RPaaS resources must have a provisioningState property. ARM TrackedResource
templates include provisioningState automatically when using
Azure.ResourceManager.ResourceProvisioningState.

## Test Cases

| ID                              | Violation | Description                                              |
| ------------------------------- | --------- | -------------------------------------------------------- |
| `missing-provisioning-state`    | false     | ARM resource includes provisioningState in properties    |
