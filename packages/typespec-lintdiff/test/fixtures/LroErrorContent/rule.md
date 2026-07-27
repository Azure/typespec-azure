---
validatorRuleId: LroErrorContent
engine: spectral
tspLints:
  - 'tsp-lintdiff-local-linter/lro-error-content'
coverageKind: lint
---

# LroErrorContent

**Severity:** error

**Applies to:** Resource Manager (ARM)

LRO operations should use standard error response content.

TypeSpec ARM templates always generate standard error responses for LRO operations,
so compliant output is expected.

The local violating repro is **blocked / suppression-dependent**: it requires
raw OpenAPI extensions plus `arm-post-operation-response-codes` suppression to
author a non-template POST LRO with a custom error shape.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `non-standard-error` | no | Standard ARM LRO operations with default error responses |
