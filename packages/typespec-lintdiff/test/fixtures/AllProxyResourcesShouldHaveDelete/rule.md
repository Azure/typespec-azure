---
engine: native
tspLints:
- '@azure-tools/typespec-azure-resource-manager/no-resource-delete-operation'
validatorRuleId: AllProxyResourcesShouldHaveDelete
---

# AllProxyResourcesShouldHaveDelete

**Severity:** warning

**Applies to:** Resource Manager (ARM)

All proxy resources should have a delete operation defined.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-delete` | yes | ProxyResource with get + createOrUpdate but no delete |
