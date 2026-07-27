---
validatorRuleId: PageableRequires200Response
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/pageable-requires-200-response
---

# PageableRequires200Response

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

A pageable operation must define a `200` response.

The local native lint mirrors the upstream Spectral rule's actual implementation:
any HTTP operation that emits `x-ms-pageable` must also emit a `200` response.

## Source-of-truth notes

- Upstream defines `PageableRequires200Response` in the shared `az-common`
  Spectral ruleset and applies it to any operation with `x-ms-pageable`.
- The implementation is a simple truthiness check on `responses[200]`; it does
  not restrict the rule to `GET` operations or validate other pageable response
  details.
- Existing local rule `get-response-codes` only overlaps one subset of the
  upstream behavior (ARM `GET` operations), so it is not sufficient coverage for
  this validator rule.

## Semantic coverage notes

The authorable upstream semantic matrix covered locally is:

- `x-ms-pageable` on an operation with only a `202` response => violation
- `x-ms-pageable` on an operation with a `200` response => compliant

## Test Cases

| ID                     | Violation | Description |
| ---------------------- | --------- | ----------- |
| `pageable-without-200` | true      | A pageable `PATCH` operation emits only a `202` response. |
| `pageable-with-200`    | false     | A pageable `PATCH` operation emits a `200` response. |
