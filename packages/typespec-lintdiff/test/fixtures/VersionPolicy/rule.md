---
validatorRuleId: VersionPolicy
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-core/operation-missing-api-version'
- tsp-lintdiff-local-linter/version-policy
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-core/operation-missing-api-version'
tspRuleset: data-plane
---

# VersionPolicy

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

API version should be specified as a query parameter, not in the path.

## Semantic coverage notes

- The upstream spectral implementation enforces three behaviors: operations need an
  `"api-version"` query parameter, that parameter must be required, and version-like path
  segments such as `/v1/...` are forbidden.
- The official `@azure-tools/typespec-azure-core/operation-missing-api-version` lint covers the
  missing-parameter case for versioned TypeSpec operations.
- The local `tsp-lintdiff-local-linter/version-policy` rule covers the remaining authorable gaps:
  optional `"api-version"` query parameters and version segments embedded in the emitted path.
- The upstream `basePath` branch is not used as a local source-of-truth case because the current
  TypeSpec emitter places service URL path segments into the OpenAPI `host` field instead of
  `basePath`, and the upstream validator does not flag that emitted shape.

## Test Cases

| ID                     | Violation | Description |
| ---------------------- | --------- | ----------- |
| `missing-api-version`  | true      | Operation omits the `api-version` query parameter entirely |
| `optional-api-version` | true      | Operation declares `api-version`, but leaves it optional |
| `version-in-path`      | true      | Route encodes the version as `/v1/...` even though `api-version` is present |
| `compliant`            | false     | Operation uses a required `api-version` query parameter and keeps the route unversioned |
