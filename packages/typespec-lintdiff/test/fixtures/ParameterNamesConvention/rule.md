---
validatorRuleId: ParameterNamesConvention
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/parameter-names-convention
---

# ParameterNamesConvention

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Query and path parameters should be camelCase, header parameters should be
kebab-case. Using PascalCase or other non-standard casing in a @query
decorator name triggers this rule.

## Source-of-truth notes

- Upstream Spectral checks every emitted OpenAPI parameter object and reports three
  distinct branches:
  - names beginning with `$` or `@`
  - non-`api-version` path/query parameters that are not camelCase
  - header parameters that are not kebab-case
- The upstream rule also traverses path-item parameters and `$ref`-based parameter
  definitions. In TypeSpec those declaration-site differences collapse into the same
  authorable surface: the emitted HTTP parameter name for each operation.

## Authorability notes

- The upstream description mentions body parameters, but the Spectral implementation
  only enforces casing for path/query/header parameters. The local native lint mirrors
  that implemented behavior.
- OpenAPI 2.0 body parameter names are not a distinct author-authored TypeSpec surface
  in this harness, so the local suite focuses on the emitted path/query/header names
  that users can directly control with `@path`, `@query`, and `@header`.

## Semantic coverage notes

The local native lint covers the authorable upstream matrix:

- query parameters with non-camel-case names
- path parameters with non-camel-case names
- parameters whose emitted name begins with `$` or `@`
- header parameters that are not kebab-case
- the special-case exemption for the emitted query name `api-version`
- a compliant control with valid path/query/header names

## Test Cases

| ID                            | Violation | Description |
| ----------------------------- | --------- | ----------- |
| `non-camel-case-param`        | true      | Query parameter emitted as `FilterExpression` violates the camelCase branch. |
| `non-camel-case-path-param`   | true      | Path parameter emitted as `WidgetId` violates the camelCase branch. |
| `query-param-leading-dollar`  | true      | Query parameter emitted as `$skip` violates the leading-character branch. |
| `header-param-not-kebab-case` | true      | Header parameter emitted as `traceId` violates the kebab-case branch. |
| `header-param-leading-dollar` | true      | Header parameter emitted as `$request-id` violates the leading-character branch. |
| `header-param-leading-at`     | true      | Header parameter emitted as `@request-id` violates the leading-character branch. |
| `compliant-names`             | false     | Valid camelCase path/query names, kebab-case header name, and `api-version` stay compliant. |
