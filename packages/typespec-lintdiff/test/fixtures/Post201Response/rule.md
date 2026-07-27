---
validatorRuleId: Post201Response
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/post-201-response
tspRuleset: data-plane
---

# Post201Response

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Using POST for a create operation (returning 201) is discouraged.
TypeSpec POST operations that return a 201 status trigger this rule.

## Source-of-truth notes

- Upstream defines `Post201Response` as a data-plane Spectral rule over OAS2
  `$.paths[*].post.responses`.
- The implementation is a simple falsy check on the `"201"` response entry, with
  message `Using post for a create operation is discouraged.`
- The upstream docs say to use `PUT` for resource creation.
- Unlike several neighboring data-plane rules, upstream does not mark this rule as
  disabled for TypeSpec data-plane authoring.

## Semantic coverage notes

The local lint mirrors the authorable upstream behavior:

- POST with a `201` response => violation
- POST with both `200` and `201` responses => violation
- POST with a `200` response and no `201` => compliant
- POST with a `204` response and no `201` => compliant

The local fixtures still emit Azure.Core's
`@azure-tools/typespec-azure-core/use-standard-operations` guidance because they
intentionally model ad hoc POST create shapes to isolate this response-code rule.
That warning does not block authoring or emission of the violating shape.

## Test Cases

| ID                      | Violation | Description |
| ----------------------- | --------- | ----------- |
| `post-with-201`         | true      | POST operation returns a `201 Created` response. |
| `post-with-200-and-201` | true      | POST operation still violates when `201` appears alongside `200`. |
| `post-with-200`         | false     | POST operation returns `200` and omits `201`. |
| `post-with-204`         | false     | POST operation returns `204` and omits `201`. |
