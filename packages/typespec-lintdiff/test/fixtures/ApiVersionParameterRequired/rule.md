---
validatorRuleId: ApiVersionParameterRequired
engine: spectral
coverageKind: lint
tspLints:
- '@azure-tools/typespec-azure-core/operation-missing-api-version'
- '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
officialTspLints:
- '@azure-tools/typespec-azure-core/operation-missing-api-version'
- '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
---

# ApiVersionParameterRequired

**Severity:** error

**Applies to:** Resource Manager (ARM)

The api-version parameter must be present in all operations.

| ID                    | Violation | Description                                                           |
| --------------------- | --------- | --------------------------------------------------------------------- |
| `missing-api-version` | true      | Custom ARM action omits `...ApiVersionParameter` and is caught directly |
