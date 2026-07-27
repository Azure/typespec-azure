---
validatorRuleId: ResourceNameRestriction
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-name-pattern'
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-name-pattern'
---

# ResourceNameRestriction

**RPC Code:** RPC-Uri-V1-05

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Validates that path parameters representing resource names have a `pattern` constraint
defined. This ensures resource names follow expected naming conventions and helps prevent
invalid resource names.

## Detection Logic

The rule inspects path parameters in each operation:

1. For each path parameter that represents a resource name (typically the last segment),
   it must have a `pattern` property defined.
2. If `pattern` is missing → error.

## Test Cases

| ID                      | Violation         | Description                                                      |
| ----------------------- | ----------------- | ---------------------------------------------------------------- |
| `missing-name-pattern`  | No pattern        | Resource name parameter has no @pattern decorator                |
