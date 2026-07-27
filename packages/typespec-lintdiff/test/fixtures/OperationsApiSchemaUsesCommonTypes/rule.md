---
validatorRuleId: OperationsApiSchemaUsesCommonTypes
engine: spectral
tspLints: []
---

# OperationsApiSchemaUsesCommonTypes

**Severity:** error

**Applies to:** Resource Manager (ARM)

The operations API should use common types schema definitions rather than custom schemas.

TypeSpec ARM templates use common types for operations, so compliant output is expected.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `custom-operations-schema` | no | Standard ARM service using common types for operations |
