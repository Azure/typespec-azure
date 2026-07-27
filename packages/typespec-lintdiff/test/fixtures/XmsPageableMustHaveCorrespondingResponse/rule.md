---
validatorRuleId: XmsPageableMustHaveCorrespondingResponse
engine: native
tspLints:
  - tsp-lintdiff-local-linter/xms-pageable-must-have-corresponding-response
tspRuleset: resource-manager
---

# XmsPageableMustHaveCorrespondingResponse

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** native

## Description

ARM operations that explicitly emit `x-ms-pageable` with a non-null `nextLinkName`
must declare that property in the most successful response body schema.

## Source-of-truth notes

- Upstream `azure-openapi-validator` implements this as an ARM-only native rule.
- The rule skips `x-ms-pageable` payloads whose `nextLinkName` is null, empty, or
  absent.
- Upstream prefers a `200` response when present, otherwise it checks the first
  available `2xx` response.
- This rule overlaps semantically with the broader validator rule
  `NextLinkPropertyMustExist`, but this local mapping is scoped only to
  `XmsPageableMustHaveCorrespondingResponse`.

## Semantic coverage notes

The local lint covers the authorable upstream semantic matrix:

- ARM pageable response with missing `nextLink` in `200` => invalid
- ARM pageable response with present `nextLink` in `200` => valid
- ARM pageable response with `nextLinkName: null` => valid
- ARM pageable response without `200` but missing `nextLink` in another `2xx` => invalid
- ARM pageable response without `200` but with `nextLink` in another `2xx` => valid

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-nextlink-property` | yes | ARM pageable response omits the property referenced by `nextLinkName` |
| `valid-pageable-response` | no | ARM pageable response declares the referenced `nextLink` property |
| `null-nextlinkname` | no | ARM pageable response stays valid when `nextLinkName` is null |
| `accepted-response-missing-nextlink` | yes | ARM pageable response falls back to another `2xx` response when `200` is absent |
| `accepted-response-with-nextlink` | no | ARM pageable response accepts another `2xx` response when the property exists |
