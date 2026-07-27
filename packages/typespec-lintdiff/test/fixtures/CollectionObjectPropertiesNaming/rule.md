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

ARM list operations that explicitly emit `x-ms-pageable` and use the upstream
`*_List...` operationId pattern must return an object with a `value` property of array
type.

## Semantic coverage notes

The local lint mirrors the authorable upstream spectral matrix:

- pageable `*_List...` operation with missing `value` => invalid
- pageable `*_List...` operation with non-array `value` => invalid
- pageable `*_List...` operation with `value` array and standard `nextLink` => valid
- pageable `*_List...` operation with `value` array and `nextLinkName: null` => valid
- pageable `*_List...` operation with `value` array and custom next link name => valid
- non-pageable/non-`*_List...` operation => valid

## Test Cases

| ID                           | Violation | Description                                               |
| ---------------------------- | --------- | --------------------------------------------------------- |
| `missing-value-property`     | yes       | Pageable `*_List` response omits the `value` property     |
| `value-not-array`            | yes       | Pageable `*_List` response has non-array `value`          |
| `value-array-nextlink`       | no        | Standard pageable collection with `value` and `nextLink`  |
| `value-array-null-nextlink`  | no        | Pageable collection remains valid when `nextLinkName` is null |
| `value-array-custom-nextlink`| no        | Pageable collection remains valid with a custom next link |
| `non-pageable-non-list`      | no        | Operation outside upstream pageable/list scope stays clean |
