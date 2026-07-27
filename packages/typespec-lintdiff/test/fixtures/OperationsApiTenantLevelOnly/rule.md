---
validatorRuleId: OperationsApiTenantLevelOnly
engine: spectral
tspLints: []
coverageKind: blocked
---

# OperationsApiTenantLevelOnly

**Severity:** error

**Applies to:** Resource Manager (ARM)

The operations API must be at tenant level (`/providers/Microsoft.*/operations`), not at
subscription or resource group level.

TypeSpec ARM templates always generate operations at tenant level, so compliant output is
expected.

Treat this case as **blocked / suppression-dependent** locally. The violating
subscription-scoped operations endpoint is authored as a standalone raw ARM path
only after suppressing `operation-missing-api-version` and
`arm-resource-operation`.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `subscription-operations` | no | Standard ARM service with tenant-level operations API |
