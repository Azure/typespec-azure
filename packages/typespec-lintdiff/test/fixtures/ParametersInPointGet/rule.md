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

**Swagger docs:** <https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/docs/parameters-in-point-get.md>

**Swagger source:** <https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/packages/rulesets/src/spectral/functions/parameters-in-point-get.ts>

Point GET operations must not have query parameters beyond api-version.

This rule is now covered by
`tsp-lintdiff-local-linter/valid-query-parameters-for-point-operations`. The
fixture's `arm-resource-operation` suppression is ambient; the extra query
parameter is still the operative authorable violation.

See [migration.md](./migration.md) for the full-corpus equivalence evidence and
the explanation of the broader TypeSpec rule's expected TypeSpec-only projects.

| ID                  | Violation | Description                                |
| ------------------- | --------- | ------------------------------------------ |
| `extra-query-param` | true      | GET has extra query parameter              |
