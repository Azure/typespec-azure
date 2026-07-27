---
validatorRuleId: RequestBodyOptional
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/request-body-optional
tspRuleset: data-plane
---

# RequestBodyOptional

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

PUT/POST/PATCH request body should be marked as required. TypeSpec body
parameters are required by default.

## Source-of-truth notes

- Upstream defines `RequestBodyOptional` as a data-plane Spectral rule over OAS2
  body parameters on `PUT`, `POST`, and `PATCH` operations.
- The implementation is a simple truthiness check on the generated
  `required` flag for each body parameter.
- The upstream test matrix has two controls: one document with optional
  request bodies for `PUT`/`PATCH`/`POST` that produces three violations, and
  one document with the same operations marked `required: true` that produces
  none.
- Local fixtures suppress `@azure-tools/typespec-azure-core/use-standard-operations`
  only to avoid unrelated Azure.Core guidance noise; that warning does not
  prevent authoring or emitting optional request bodies.

## Semantic coverage notes

The local lint mirrors the authorable upstream semantic matrix:

- `PUT` operation with an optional request body => violation
- `PATCH` operation with an optional request body => violation
- `POST` operation with an optional request body => violation
- `PUT` operation with a required request body => compliant
- `PATCH` operation with a required request body => compliant
- `POST` operation with a required request body => compliant

## Test Cases

| ID                  | Violation | Description                                                |
| ------------------- | --------- | ---------------------------------------------------------- |
| `body-not-required` | true      | Optional request bodies on `PUT`, `PATCH`, and `POST` warn |
| `body-required`     | false     | Required request bodies on `PUT`, `PATCH`, and `POST` pass |
