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

For ARM GET operations, return a successful `200` response. A `202` polling
response and an error response are also allowed, but `201`, `204`, and other
response codes are not. Correct a GET that returns only an error by adding its
successful resource response, for example
`ArmResponse<Widget> | ErrorResponse` rather than `ErrorResponse`.

## LintDiff Equivalent

The temporary lintdiff rule checks operations within an ARM provider namespace,
including nested namespaces. The official ARM ruleset supplies the applicability
boundary when this rule is promoted; the temporary mixed-ruleset runner needs
provider ancestry to exclude unrelated data-plane services.

### Source-of-truth notes

- The upstream spectral implementation enforces three conditions only: the
  response set must be non-empty, it must include `200`, and every response code
  must be one of `200`, `202`, or `default`.
- The separate validator rules `DefaultResponse` and `LroLocationHeader` own the
  "default response exists" and "`202` includes `Location`" concerns. Those
  constraints are documented in upstream prose but are not enforced by the
  `GetResponseCodes` function itself.

### Authorability notes

- The upstream unit test for an empty `responses` object is not authorable in
  this TypeSpec harness because emitted HTTP operations always produce at least
  one OpenAPI response entry.

## Detection Logic

The rule checks each ARM GET operation's resolved HTTP responses:

1. If there are no HTTP responses → warning.
2. If there is no `200` response → warning.
3. If a response code is not `200`, `202`, or the default error response → warning.

## Test Cases

| ID                        | Violation | Description                                                                                                       |
| ------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `get-200-only`            | No        | GET returns only `200`; this is allowed because `default` is enforced separately by `DefaultResponse`.            |
| `get-200-and-default`     | No        | GET returns the standard `200` + `default` shape.                                                                 |
| `get-202-with-location`   | No        | GET includes an additional `202` response with a `Location` header.                                               |
| `get-missing-200`         | Yes       | GET has only `default`, so the required `200` response is missing.                                                |
| `get-nested-missing-200`  | Yes       | GET in a child namespace of the ARM provider has only `default`; provider ancestry must not suppress the warning. |
| `get-extra-response-code` | Yes       | GET has `200`, `204`, and `default`; `204` is not allowed.                                                        |
| `get-extra-201`           | Yes       | GET has `200`, `201`, and `default`; `201` is not allowed.                                                        |
