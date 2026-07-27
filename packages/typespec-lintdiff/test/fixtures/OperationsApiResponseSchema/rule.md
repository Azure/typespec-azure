---
validatorRuleId: OperationsApiResponseSchema
engine: spectral
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
  - '@azure-tools/typespec-azure-core/operation-missing-api-version'
---

# OperationsApiResponseSchema

**Severity:** error

**Applies to:** Resource Manager (ARM)

The operations API must return a standard response format (OperationListResult).

TypeSpec ARM templates generate the standard operations API response at
`/providers/{namespace}/operations`. The previous violating fixture only existed by bypassing that
template with a custom endpoint while suppressing
`@azure-tools/typespec-azure-resource-manager/arm-resource-operation` and
`@azure-tools/typespec-azure-core/operation-missing-api-version`, so this rule is template-
enforced/suppression-dependent rather than a native lint gap.

The current ARM compliance control still triggers the validator once because the compiled
`OperationsApiResponseSchema` Spectral function inspects the response `schema` object directly and
does not follow the template-generated `$ref` to `OperationListResult`. That reviewed
validator-only discrepancy is now encoded in `expect.json` so the residual report treats it as
settled test-quality evidence rather than an unexplained compliance failure.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `non-standard-response` | no | Standard ARM service with the template-generated operations response schema; reviewed validator discrepancy on the `OperationListResult` `$ref` |
