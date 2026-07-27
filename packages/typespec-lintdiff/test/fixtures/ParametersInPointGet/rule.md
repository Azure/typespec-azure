---
validatorRuleId: ParametersInPointGet
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/valid-query-parameters-for-point-operations
coverageKind: lint
---

# ParametersInPointGet

**Severity:** error

**Applies to:** Resource Manager (ARM)

Point GET operations must not have query parameters beyond api-version.

This rule is now covered by
`tsp-lintdiff-local-linter/valid-query-parameters-for-point-operations`. The
fixture's `arm-resource-operation` suppression is ambient; the extra query
parameter is still the operative authorable violation.

| ID                  | Violation | Description                                |
| ------------------- | --------- | ------------------------------------------ |
| `extra-query-param` | true      | GET has extra query parameter              |
