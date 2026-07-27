---
engine: native
tspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-path-segment-invalid-chars'
validatorRuleId: PathResourceTypeNameCamelCase
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-path-segment-invalid-chars'
---

# PathResourceTypeNameCamelCase

**Severity:** error

**Applies to:** Resource Manager (ARM)

Resource type name segments in paths must use camelCase.

| ID                       | Violation | Description                                     |
| ------------------------ | --------- | ----------------------------------------------- |
| `non-camel-case-segment` | true      | Path segment uses PascalCase resource type name |
