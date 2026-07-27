---
validatorRuleId: BodyTopLevelProperties
engine: native
tspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property'
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property'
---

# BodyTopLevelProperties

**RPC Code:** RPC-Put-V1-06

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Native (not Spectral)

## Description

Top-level properties of an ARM resource must be from the allowed set: `name`, `type`, `id`,
`location`, `properties`, `tags`, `plan`, `sku`, `etag`, `managedBy`, `identity`, `kind`,
`zones`, `systemData`, `extendedLocation`.

Any additional properties must be placed inside the `properties` bag.

## Test Cases

| ID                         | Violation                        | Description                                                                           |
| -------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| `extra-top-level-property` | Disallowed property at top level | Resource has a custom `extraProperty` at the top level instead of inside `properties` |
