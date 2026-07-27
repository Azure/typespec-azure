---
validatorRuleId: RequestBodyNotAllowed
engine: spectral
coverageKind: lint
tspLints:
  - tsp-lintdiff-local-linter/request-body-not-allowed
tspRuleset: data-plane
---

# RequestBodyNotAllowed

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

GET and DELETE operations must not declare a request body.

## Source-of-truth notes

- Upstream defines `RequestBodyNotAllowed` as a data-plane Spectral rule over OAS2
  `$.paths[*][get,delete].parameters[*]`.
- The implementation reports when a GET or DELETE parameter has `in: body`.
- The upstream docs say the fix is to remove the request body or change the
  operation to POST.
- I did not find a dedicated combined upstream unit test file for
  `RequestBodyNotAllowed`, but the adjacent upstream GET and DELETE
  request-body tests confirm the same verb-level semantics independently.

## Semantic coverage notes

The local lint mirrors the authorable upstream behavior:

- GET with a request body => violation
- DELETE with a request body => violation
- GET and DELETE without request bodies => compliant
- POST with a request body => compliant

The violating data-plane shapes are directly authorable in TypeSpec without
suppression or prerequisite blocking diagnostics, so this rule is a real native
coverage gap rather than a template-enforced ARM-only scenario.

## Test Cases

| ID                      | Violation | Description |
| ----------------------- | --------- | ----------- |
| `get-with-body`         | true      | GET operation declares a request body. |
| `delete-with-body`      | true      | DELETE operation declares a request body. |
| `get-and-delete-no-body`| false     | GET and DELETE operations omit request bodies. |
| `post-with-body`        | false     | POST operation body remains allowed. |
