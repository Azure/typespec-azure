---
validatorRuleId: PutPath
engine: spectral
coverageKind: lint
tspLints:
  - tsp-lintdiff-local-linter/put-path
tspRuleset: data-plane
---

# PutPath

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

PUT paths should end with a path parameter for the resource identifier.
A PUT operation on a path without a trailing path parameter triggers this rule.

## Source-of-truth notes

- Upstream defines `PutPath` as a data-plane Spectral rule over OpenAPI 2 and 3
  `$.paths[*].put^~` values.
- The implementation is a simple path-shape check: a PUT path is compliant only
  when the emitted OpenAPI path string ends with `}`.
- The upstream unit tests cover one violating PUT path without a trailing path
  parameter and one compliant PUT path that ends with a path parameter.

## Semantic coverage notes

The local native lint mirrors the authorable upstream matrix:

- PUT paths ending with a literal segment => violation
- PUT paths with an earlier path parameter but a non-parameter final segment =>
  violation
- PUT paths ending with a final path parameter => compliant

## Test Cases

| ID                            | Violation | Description |
| ----------------------------- | --------- | ----------- |
| `put-not-ending-with-param`   | true      | PUT path ends with a literal segment. |
| `put-param-not-final`         | true      | PUT path has a path parameter, but the final segment is still literal. |
| `put-ending-with-param`       | false     | PUT path ends with a final path parameter. |
