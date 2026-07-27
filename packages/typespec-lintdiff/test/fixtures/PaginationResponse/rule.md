---
validatorRuleId: PaginationResponse
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/pagination-response
tspRuleset: data-plane
---

# PaginationResponse

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Flags data-plane GET/POST operations that look pageable but omit pageable metadata,
and validates explicit `x-ms-pageable` response shapes. The upstream markdown for
this rule is stale; local coverage follows the upstream implementation and tests.

## Semantic coverage notes

The local lint mirrors the authorable upstream semantic matrix:

- GET list-shaped response without pageable metadata => invalid
- POST list-shaped response without pageable metadata => invalid
- explicit pageable response with missing/non-array/optional `value` => invalid
- explicit pageable response with missing/non-string/required next link => invalid
- explicit pageable response with standard `nextLink` => valid
- explicit pageable response with `nextLinkName: null` and `nextLink` => valid
- explicit pageable response with custom next link property => valid
- list-shaped response with extra top-level properties => valid
- native TypeSpec paging metadata => valid without explicit `x-ms-pageable`

## Test Cases

| ID | Violation | Description |
| --- | --- | --- |
| `list-without-pagination` | yes | GET list-shaped response omits pageable metadata |
| `post-without-pagination` | yes | POST list-shaped response omits pageable metadata |
| `pageable-value-not-array` | yes | Explicit pageable response uses a non-array `value` |
| `pageable-value-optional` | yes | Explicit pageable response makes `value` optional |
| `pageable-missing-value` | yes | Explicit pageable response omits `value` |
| `pageable-nextlink-not-string` | yes | Explicit pageable response uses a non-string `nextLink` |
| `pageable-nextlink-required` | yes | Explicit pageable response makes `nextLink` required |
| `pageable-null-nextlinkname-missing-nextlink` | yes | `nextLinkName: null` still requires a `nextLink` property |
| `pageable-standard-nextlink` | no | Explicit pageable response with `value` and `nextLink` stays valid |
| `pageable-null-nextlinkname-with-nextlink` | no | `nextLinkName: null` remains valid when `nextLink` exists |
| `pageable-custom-nextlink` | no | Explicit pageable response can use a custom next link property |
| `non-pageable-extra-properties` | no | Extra top-level properties keep a collection response outside upstream heuristic scope |
| `native-page-template` | no | Native TypeSpec paging metadata prevents a false missing-pageable warning |
