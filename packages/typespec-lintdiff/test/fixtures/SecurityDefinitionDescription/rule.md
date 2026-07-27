---
validatorRuleId: SecurityDefinitionDescription
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/security-definition-description
coverageKind: lint
---

# SecurityDefinitionDescription

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Security definitions should have a description. In TypeSpec, the emitted OpenAPI
security definition description comes from the `@doc` on the auth model passed to
`@useAuth`.

## Source-of-truth notes

- Upstream fires when an emitted OpenAPI `securityDefinitions[*]` or
  `components.securitySchemes[*]` object lacks a `description`.
- In the local TypeSpec + AutoRest harness, the authorable description source is
  the auth model doc captured by `@typespec/http` and forwarded by
  `@azure-tools/typespec-autorest`.

## Authorability notes

- The current validation harness emits Swagger 2 via `@azure-tools/typespec-autorest`,
  so the meaningful local matrix is the OpenAPI 2 branch.
- `BasicAuth`, non-cookie `ApiKeyAuth`, and OAuth2 auth models are authorable and
  emit security definitions here.
- Bearer and OpenID Connect auth are not emitted as Swagger 2 security
  definitions by this harness, so they are intentionally out of scope.

## Semantic coverage notes

The local lint inspects explicit `@useAuth` usage on:

- the service namespace
- interfaces
- individual operations

It warns when an auth model would emit a Swagger 2 security definition but has no
doc-derived description.

## Test Cases

| ID | Violation | Description |
| --- | --------- | ----------- |
| `missing-security-description` | true | Direct service-level `ApiKeyAuth` emits an undocumented security definition. |
| `missing-interface-basic-description` | true | Direct interface-level `BasicAuth` also emits an undocumented security definition. |
| `missing-operation-oauth2-description` | true | Direct operation-level OAuth2 auth without `@doc` still emits an undocumented security definition. |
| `documented-api-key-model` | false | A documented custom API key auth model emits a described security definition. |
| `documented-basic-model` | false | A documented custom basic auth model emits a described security definition. |
| `documented-oauth2-model` | false | A documented custom OAuth2 auth model emits a described security definition. |
