---
engine: native
tspLints:
- '@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint'
validatorRuleId: OperationsAPIImplementation
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint'
---

# OperationsAPIImplementation

**Severity:** error

**Applies to:** Resource Manager (ARM)

The spec must include a `/providers/Microsoft.*/operations` path for the operations API.

TypeSpec ARM templates with `@armProviderNamespace` automatically generate the operations
endpoint, so compliant output is expected.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-operations` | no | Standard ARM service with auto-generated operations API |
