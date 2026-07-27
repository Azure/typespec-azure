---
validatorRuleId: XmsPageableListByRGAndSubscriptions
engine: native
tspLints: []
---

# XmsPageableListByRGAndSubscriptions

**Severity:** warning

**Applies to:** Resource Manager (ARM)

Checks that list-by-resource-group and list-by-subscription operations have the same x-ms-pageable configuration.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `consistent-pageable` | no | Standard ARM resource with consistent pageable config on both list operations |
