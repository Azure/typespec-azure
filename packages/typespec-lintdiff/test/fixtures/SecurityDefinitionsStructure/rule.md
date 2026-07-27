---
validatorRuleId: SecurityDefinitionsStructure
engine: spectral
tspLints: []
coverageKind: template
tspRuleset: resource-manager
---

# SecurityDefinitionsStructure

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

ARM OpenAPI documents must use the standard `securityDefinitions.azure_auth`
OAuth2 shape.

## Source-of-truth notes

- Upstream `azure-openapi-validator` implements this as a whole-document Spectral
  check.
- The rule only passes when `securityDefinitions.azure_auth` has:
  - `type: oauth2`
  - `flow: implicit`
  - `authorizationUrl: https://login.microsoftonline.com/common/oauth2/authorize`
  - a truthy `description`
  - `scopes.user_impersonation`
- The upstream tests cover a simple two-case matrix:
  - malformed `azure_auth` => violation
  - canonical `azure_auth` => compliant

## TypeSpec source notes

The previous local fixture was not a trustworthy ARM migration repro: it used a
plain non-ARM `@useAuth(ApiKeyAuth...)` service, so it only showed that
arbitrary Swagger 2 security definitions can violate the rule when the service
is authored outside the ARM model.

For actual ARM authoring in this repo, `Azure.ResourceManager` templates emit
the required `azure_auth` OAuth2 security definition automatically. That makes
this rule **template-enforced / emitter-enforced** locally rather than a native
lint gap.

The malformed upstream branch is not part of the clean authorable ARM matrix in
this harness because ARM templates own the emitted security definition
structure.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `compliant` | false | ARM resource templates emit the canonical `azure_auth` OAuth2 security definition |
