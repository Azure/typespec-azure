---
validatorRuleId: NoErrorCodeResponses
engine: spectral
tspLints:
  - "tsp-lintdiff-local-linter/no-error-code-responses"
  - "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes"
officialTspLints:
  - "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes"
coverageKind: lint
---

# NoErrorCodeResponses

**Severity:** error

**Applies to:** Resource Manager (ARM)

Operations should not define response codes outside the ARM allowed set of `200`,
`201`, `202`, `204`, and `default`. Errors should be represented using the default
response only.

TypeSpec ARM templates use default error responses and do not generate explicit error
status codes, so compliant output is expected. For the local wave-A POST action repro,
`@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes` is the direct
native signal that the explicit `404` response is not allowed. The local rule still
checks all ARM operations because the Swagger rule runs on every operation response
key and because official POST response-code coverage does not cover all methods or
nested provider namespaces. TypeSpec status-code ranges such as `300..399` emit
grouped Swagger response keys such as `3XX`, which are also outside the validator's
allowed set.

## Test Cases

| ID                          | Violation | Description                                                              |
| --------------------------- | --------- | ------------------------------------------------------------------------ |
| `explicit-error-codes`      | yes       | ARM resource action with an explicit `404` response                      |
| `nested-provider-namespace` | yes       | Nested provider namespace operation with an explicit `302` response      |
| `status-code-range`         | yes       | ARM resource action with a `300..399` response range                     |
| `default-error-response`    | no        | ARM resource action with only a `200` success and default error response |
