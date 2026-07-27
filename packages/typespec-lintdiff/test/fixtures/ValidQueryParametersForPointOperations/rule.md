---
validatorRuleId: ValidQueryParametersForPointOperations
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/valid-query-parameters-for-point-operations
tspRuleset: resource-manager
---

# ValidQueryParametersForPointOperations

**Severity:** error

**Applies to:** Resource Manager (ARM)

Point operations (GET, PUT, PATCH, DELETE) must not have query params other than api-version.

## Semantic coverage notes

The upstream semantic matrix includes:

- top-level point GET, PUT, PATCH, and DELETE with extra query parameters => invalid
- nested point GET and PUT with extra query parameters => invalid
- point operation with multiple extra query parameters => multiple invalid diagnostics
- point operations with only api-version/default parameters => valid
- list operations with extra query parameters => valid for this rule, though they remain covered by `QueryParametersInCollectionGet`

TypeSpec does not model an explicit OpenAPI `parameters` array separately, so the
"api-version only" and "parameters omitted" upstream compliance cells collapse to
the same clean point-operation fixture locally.

The upstream `x-ms-paths` example is not cleanly authorable here: `@sharedRoute`
emits `?_overload=...` disambiguators, and the upstream validator rule does not
reproduce on that emitted shape.

Some point-resource GETs are authored as ARM actions (e.g. legacy
`Azure.ResourceManager.Legacy.RoutedOperations.ActionSync`) rather than standard
resource reads. The upstream validator classifies point operations purely by path
shape, so the local rule falls back to the point-operation path regex whenever an
operation's ARM kind is not itself a point kind (covered by `legacy-action-point-get`).

| ID                         | Violation | Description                                                          |
| -------------------------- | --------- | -------------------------------------------------------------------- |
| `extra-query-param`        | true      | Top-level point GET, PUT, PATCH, and DELETE have extra query params  |
| `nested-extra-query-param` | true      | Nested point GET and PUT have extra query params                     |
| `multiple-query-params`    | true      | Point GET has more than one extra query parameter                    |
| `legacy-action-point-get`  | true      | Point-path GET authored as a legacy routed ARM action has query param |
| `api-version-only`         | false     | Point operations only use default query parameters                   |
| `list-operation`           | false     | Collection/list GET is outside this rule's scope                     |
