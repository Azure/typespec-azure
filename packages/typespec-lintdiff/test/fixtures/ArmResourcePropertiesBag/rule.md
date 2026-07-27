---
engine: native
tspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-duplicate-property'
validatorRuleId: ArmResourcePropertiesBag
---

# ArmResourcePropertiesBag

**Severity:** error

**Applies to:** Resource Manager (ARM)

Properties inside the properties bag should not duplicate top-level ARM resource properties (such as id, name, type).

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `duplicate-properties` | yes | Properties bag contains properties that duplicate top-level ARM properties |
