---
validatorRuleId: QueryParametersInCollectionGet
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/query-parameters-in-collection-get
projectionScope: http-reachable
---

# QueryParametersInCollectionGet

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Original Swagger linter:** [QueryParametersInCollectionGet](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/query-parameters-in-collection-get.ts)

Collection GET must not have query params other than api-version and $filter.

## Semantic coverage notes

The upstream semantic matrix includes:

- collection GET with one disallowed query parameter => invalid
- collection GET with multiple disallowed query parameters => multiple invalid diagnostics
- collection GET with only api-version and $filter => valid
- collection-shaped GET not registered as an ARM resource list => invalid
- collection GET with a mis-cased `$FILTER` parameter => invalid
- collection GET with disallowed parameters inherited from a library model => invalid
- collection GET declared in a child of an ARM provider namespace => invalid
- point GET with extra query parameters => valid for this rule
- non-GET operations => valid for this rule

| ID                          | Violation | Description                                                        |
| --------------------------- | --------- | ------------------------------------------------------------------ |
| `extra-query-param`         | true      | List operation has one extra query parameter                       |
| `multiple-query-params`     | true      | List operation has more than one extra query parameter             |
| `api-version-and-filter`    | false     | List operation only uses api-version and `$filter`                 |
| `raw-collection-get`        | true      | Collection-shaped GET is checked without ARM list registration     |
| `mis-cased-filter`          | true      | `$FILTER` is not exempt because query parameter names are exact    |
| `library-query-parameters`  | true      | Library-provided query parameters report on the local operation    |
| `nested-provider-namespace` | true      | Child namespaces inherit ARM provider status                       |
| `point-get-extra-query`     | false     | Point GET is outside this rule's scope                             |
| `non-get-collection`        | false     | A non-GET operation on a collection path is outside the rule scope |
