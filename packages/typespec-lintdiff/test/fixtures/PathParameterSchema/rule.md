---
validatorRuleId: PathParameterSchema
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/path-parameter-schema
tspRuleset: data-plane
---

# PathParameterSchema

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Path parameters should be type string with maxLength and pattern specified.

## Source-of-truth notes

- Upstream defines `PathParameterSchema` as a data-plane Spectral rule over emitted
  OpenAPI path parameters.
- The implementation reports five semantic branches:
  - schema type is not `string`
  - both `maxLength` and `pattern` are missing
  - only `maxLength` is missing
  - `maxLength` is present but greater than or equal to `2083`
  - only `pattern` is missing
- Upstream unit tests exercise those branches across OAS2 path-level parameters,
  operation-level parameters, `$ref`-based parameters, and OAS3 `schema` wrappers.
  Those OpenAPI-shape distinctions collapse to the same TypeSpec authoring surface:
  an emitted `@path` parameter.

## Authorability notes

- TypeSpec path parameters are authorable as non-string scalars, so the local lint
  preserves the upstream "wrong type" branch instead of assuming all path params
  are strings.
- Constraint metadata can come from either the parameter property itself or a
  referenced scalar type, so the local rule checks both declaration sites.
- The fixtures run under the data-plane ruleset and include auth, docs, and an
  `api-version` query parameter to keep validation noise focused on this rule.

## Semantic coverage notes

The local native lint covers the authorable upstream matrix:

- non-string path parameter => wrong-type diagnostic plus missing-constraints diagnostic
- string path parameter missing both `maxLength` and `pattern` => combined diagnostic
- string path parameter missing only `maxLength` => max-length diagnostic
- string path parameter with `maxLength >= 2083` => size-limit diagnostic
- string path parameter missing only `pattern` => pattern diagnostic
- compliant path parameter with both constraints and a shorter max length => compliant

## Test Cases

| ID                        | Violation | Description |
| ------------------------- | --------- | ----------- |
| `missing-max-length`      | true      | Path parameter omits both `maxLength` and `pattern`. |
| `missing-max-length-only` | true      | Path parameter keeps `pattern` but omits `maxLength`. |
| `missing-pattern`         | true      | Path parameter keeps `maxLength` but omits `pattern`. |
| `max-length-too-large`    | true      | Path parameter uses `maxLength: 2083`, which upstream rejects. |
| `non-string-path-param`   | true      | Path parameter is typed as `int32`, so upstream also reports the missing constraints branch. |
| `compliant-path-parameter` | false    | Path parameter is a constrained string with both `maxLength` and `pattern`. |
