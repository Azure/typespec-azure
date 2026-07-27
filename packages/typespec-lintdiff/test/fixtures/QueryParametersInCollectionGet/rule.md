---
validatorRuleId: QueryParametersInCollectionGet
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/query-parameters-in-collection-get
---

# QueryParametersInCollectionGet

**Severity:** error

**Applies to:** Resource Manager (ARM)

Collection GET must not have query params other than api-version and $filter.

## Semantic coverage notes

The upstream semantic matrix includes:

- collection GET with one disallowed query parameter => invalid
- collection GET with multiple disallowed query parameters => multiple invalid diagnostics
- collection GET with only api-version and $filter => valid
- point GET with extra query parameters => valid for this rule
- non-GET operations => valid for this rule

| ID                       | Violation | Description                                                |
| ------------------------ | --------- | ---------------------------------------------------------- |
| `extra-query-param`      | true      | List operation has one extra query parameter               |
| `multiple-query-params`  | true      | List operation has more than one extra query parameter     |
| `api-version-and-filter` | false     | List operation only uses api-version and `$filter`         |
| `point-get-extra-query`  | false     | Point GET is outside this rule's scope                     |
