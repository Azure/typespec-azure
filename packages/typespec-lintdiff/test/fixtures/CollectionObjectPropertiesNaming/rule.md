---
validatorRuleId: CollectionObjectPropertiesNaming
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/collection-object-properties-naming
---

# CollectionObjectPropertiesNaming

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Paged ARM resource list operations should return a response object with an
array property named `value`. The standard `Azure.Core.Page<Resource>` and
`ResourceListResult<Resource>` templates supply this property. When overriding
the response model, keep that shape even if the page-items decorator is placed
on a differently named array.

## Incorrect

```typespec
model WidgetListResult {
  @pageItems items: Widget[];
  @nextLink nextLink?: string;
}
```

## Correct

```typespec
model WidgetListResult {
  @pageItems value: Widget[];
  @nextLink nextLink?: string;
}
```

The rule checks ARM list operations (including paginated POST actions) marked `@list` with a `@nextLink`
and reports the response model (missing `value`) or its `value` property
(non-array). A list without a next link is not a paginated response. TypeSpec
itself reports a missing `@pageItems` property or a non-array property marked
`@pageItems`; those invalid shapes are not additional rule cases.

## Migration notes

The Swagger validator selects GET and POST operations with an `x-ms-pageable`
extension, an operation ID matching `*_List...`, and a 200 response schema.
The temporary ARM-specific rule uses the provider namespace and TypeSpec
paging metadata instead of parsing emitted operation IDs or relying on
OpenAPI decorators. The ARM templates permit an overridden response model,
so their default `value` property does not make the rule redundant. The
official ARM ruleset supplies the applicability boundary on promotion; the
provider-namespace check here isolates this rule in lintdiff's mixed runner.
See `migration.md` for emitted-reference and corpus comparisons.

## Test Cases

| ID                            | Violation | Description                                             |
| ----------------------------- | --------- | ------------------------------------------------------- |
| `missing-value-property`      | yes       | Page-items array uses `items` instead of `value`        |
| `post-action-missing-value`   | yes       | Paginated POST list action returns an `items` array     |
| `value-not-array`             | yes       | `value` is scalar while `items` supplies page items     |
| `value-array-nextlink`        | no        | Page with `value` array and standard next link          |
| `value-array-null-nextlink`   | no        | List without `@nextLink` is not pageable                |
| `value-array-custom-nextlink` | no        | Page with `value` and a custom next-link property       |
| `non-pageable-non-list`       | no        | Resource-list metadata without `@list` is outside scope |
