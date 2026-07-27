---
validatorRuleId: PutRequestResponseScheme
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/put-request-response-scheme
coverageKind: lint
---

# PutRequestResponseScheme

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

PUT request body schema must match the 200 response schema. This legacy
test intentionally uses different request and response models to provoke the
validator violation.

## Source-of-truth notes

- The upstream spectral function compares the PUT request body schema to the
  `200` response schema and falls back to `201` when no `200` response exists.
- The local TypeSpec lint mirrors that data-plane behavior and intentionally
  skips ARM namespaces so it does not overlap `PutRequestResponseSchemeArm`.

## Test Cases

| ID                        | Violation | Description                                                |
| ------------------------- | --------- | ---------------------------------------------------------- |
| `put-schema-match`        | false     | PUT request and `200` response use the same schema.        |
| `put-schema-mismatch`     | true      | PUT request and `200` response use different schemas.      |
| `put-schema-mismatch-201` | true      | PUT has no `200`; request body differs from the `201` body.|
