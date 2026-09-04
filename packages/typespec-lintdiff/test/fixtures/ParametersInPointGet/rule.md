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

This rule's GET-specific violation is covered by the consolidated
`tsp-lintdiff-local-linter/valid-query-parameters-for-point-operations` rule.
That TypeSpec rule intentionally also covers PUT, PATCH, and DELETE for the
broader staging-only `ValidQueryParametersForPointOperations` validator rule, so
the `ParametersInPointGet` corpus row has expected TypeSpec-only projects. The
fixture's `arm-resource-operation` suppression is ambient; the extra query
parameter is still the operative authorable violation.

See [migration.md](./migration.md) for the full-corpus equivalence evidence and
the explanation of the broader TypeSpec rule's expected TypeSpec-only projects.

| ID                  | Violation | Description                   |
| ------------------- | --------- | ----------------------------- |
| `extra-query-param` | true      | GET has extra query parameter |
