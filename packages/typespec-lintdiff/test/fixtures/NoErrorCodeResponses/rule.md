---
validatorRuleId: NoErrorCodeResponses
engine: spectral
tspLints:
  - 'tsp-lintdiff-local-linter/no-error-code-responses'
  - '@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes'
officialTspLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes'
coverageKind: lint
---

# NoErrorCodeResponses

**Severity:** error

**Applies to:** Resource Manager (ARM)

Operations should not define explicit 4xx/5xx error response codes. Errors should be
represented using the default response only.

TypeSpec ARM templates use default error responses and do not generate explicit error
status codes, so compliant output is expected. For the local wave-A POST action repro,
`@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes` is the direct
native signal that the explicit `404` response is not allowed.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `explicit-error-codes` | no | Standard ARM operations with default error responses only |
