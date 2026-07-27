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
- repeated use of the same parameter name after the same segment
- different segments using different parameter names without conflict

## Test Cases

| ID                                   | Violation | Description |
| ------------------------------------ | --------- | ----------- |
| `inconsistent-param-names`           | true      | Top-level `widgets` paths reuse the segment with different parameter names. |
| `inconsistent-nested-param-names`    | true      | Nested `books` paths reuse the segment with different parameter names. |
| `consistent-param-names`             | false     | Reused segments keep the same path parameter name, while unrelated segments can differ. |
