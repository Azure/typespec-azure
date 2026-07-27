---
validatorRuleId: GetResponseCodes
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/get-response-codes
coverageKind: lint
---

# GetResponseCodes

**RPC Code:** RPC-Get-V1-01

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Validates that GET operations include a `200` response and do not use disallowed
response codes.

- GET must have a `200` response.
- GET may additionally have `202` and `default`.
- No other response codes are allowed.

The local ARM TypeSpec lint mirrors the upstream `GetResponseCodes` spectral
function.

## Source-of-truth notes

- The upstream spectral implementation enforces three conditions only: the
  response set must be non-empty, it must include `200`, and every response code
  must be one of `200`, `202`, or `default`.
- The separate validator rules `DefaultResponse` and `LroLocationHeader` own the
  "default response exists" and "`202` includes `Location`" concerns. Those
  constraints are documented in upstream prose but are not enforced by the
  `GetResponseCodes` function itself.

## Authorability notes

- The upstream unit test for an empty `responses` object is not authorable in
  this TypeSpec harness because emitted HTTP operations always produce at least
  one OpenAPI response entry.

## Detection Logic

The rule inspects each GET operation's `responses` object:

1. If `responses` is empty → error.
2. If `200` is not present → error.
3. If any response code is not in `[200, 202, default]` → error.

## Test Cases

| ID                        | Violation | Description |
| ------------------------- | --------- | ----------- |
| `get-200-only`            | No        | GET returns only `200`; this is allowed because `default` is enforced separately by `DefaultResponse`. |
| `get-200-and-default`     | No        | GET returns the standard `200` + `default` shape. |
| `get-202-with-location`   | No        | GET includes an additional `202` response with a `Location` header. |
| `get-missing-200`         | Yes       | GET has only `default`, so the required `200` response is missing. |
| `get-extra-response-code` | Yes       | GET has `200`, `204`, and `default`; `204` is not allowed. |
| `get-extra-201`           | Yes       | GET has `200`, `201`, and `default`; `201` is not allowed. |
