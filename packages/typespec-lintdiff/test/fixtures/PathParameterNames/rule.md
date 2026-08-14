---
validatorRuleId: PathParameterNames
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/path-parameter-names
tspRuleset: data-plane
---

# PathParameterNames

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Path parameter names should be consistent across all paths. Raw `@route`
placeholders remain authorable in TypeSpec, so a native lint is needed to catch
inconsistent placeholder names after the same path segment.

## Source-of-truth notes

- Upstream Spectral walks the emitted OpenAPI `paths` object and remembers the
  parameter name that follows each preceding path segment.
- A later path that reuses the same preceding segment with a different path
  parameter name triggers a violation.
- The upstream rule is format-agnostic across OpenAPI 2 and 3; in this
  repository the authorable TypeSpec surface collapses to the emitted route
  template, so the local native lint checks TypeSpec HTTP operation paths
  directly.

## Semantic coverage notes

The local native lint covers the authorable upstream matrix:

- the same top-level segment followed by different path parameter names
- the same nested segment followed by different path parameter names across
  different parent paths
- one diagnostic per emitted path when multiple HTTP methods share the route
- version-exclusive routes are compared only within their emitted service version
- distinct paths remain independently diagnosed when they reuse one parameter property
- reused parameter properties remain independently diagnosed across services
- literal-query routes emitted under `x-ms-paths` are excluded
- emitted `paths` keys are evaluated in AutoRest's deterministic URL order
- repeated use of the same parameter name after the same segment
- different segments using different parameter names without conflict
- ARM provider namespaces are excluded because the validator rule is data-plane
  only

## Test Cases

| ID                                 | Violation | Description                                                                             |
| ---------------------------------- | --------- | --------------------------------------------------------------------------------------- |
| `inconsistent-param-names`         | true      | Top-level `widgets` paths reuse the segment with different parameter names.             |
| `inconsistent-nested-param-names`  | true      | Nested `books` paths reuse the segment with different parameter names.                  |
| `inconsistent-shared-path-methods` | true      | One inconsistent `widgets` path shared by GET and DELETE emits one diagnostic.          |
| `consistent-param-names`           | false     | Reused segments keep the same path parameter name, while unrelated segments can differ. |
