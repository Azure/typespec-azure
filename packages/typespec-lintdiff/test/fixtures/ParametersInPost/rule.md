---
validatorRuleId: ParametersInPost
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/parameters-in-post
---

# ParametersInPost

**Severity:** error

**Applies to:** Resource Manager (ARM)

POST operations must not have query parameters beyond api-version.

## Semantic coverage notes

The upstream semantic matrix includes:

- POST action with one disallowed query parameter => invalid
- POST action with multiple disallowed query parameters => multiple invalid diagnostics
- POST action with only api-version in query => valid
- POST action with no extra query parameters => valid

| ID                      | Violation | Description                                               |
| ----------------------- | --------- | --------------------------------------------------------- |
| `query-param-in-post`   | true      | POST action has one extra query parameter                 |
| `multiple-query-params` | true      | POST action has more than one extra query parameter       |
| `api-version-only`      | false     | POST action has no extra query parameters beyond defaults |
