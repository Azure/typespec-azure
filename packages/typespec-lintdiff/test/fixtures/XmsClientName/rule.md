---
validatorRuleId: XmsClientName
engine: spectral
tspLints: []
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-core/no-openapi'
tspRuleset: data-plane
---

# XmsClientName

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Validates that when `x-ms-client-name` is specified on a property or
parameter, its value is different from the original name. Setting
`x-ms-client-name` to the same source name is redundant.

## Source-of-truth notes

- Upstream `azure-openapi-validator` implements this as one combined Spectral
  rule with separate property and parameter branches.
- The upstream tests cover two semantic branches directly: matching source name
  => invalid, different client name => valid.
- Canonical TypeSpec authoring uses `@clientName` from
  `@azure-tools/typespec-client-generator-core`, not raw
  `@extension("x-ms-client-name", ...)`.
- When `@clientName` matches the original property or parameter name, the
  autorest emitter omits `x-ms-client-name` entirely. The validator rule
  therefore has no violating OpenAPI shape to report for that authoring path.
- Raw `@extension("x-ms-client-name", ...)` fixtures can still reproduce the
  upstream warning, but that path is already non-canonical and emits
  `@azure-tools/typespec-azure-core/no-openapi`.

Treat this rule as **template-enforced / emitter-enforced** locally rather than
as a native-lint gap.

## Semantic coverage notes

The local suite covers the authorable matrix needed for migration screening:

- raw property extension with matching source name => validator violation
- raw parameter extension with matching source name => validator violation
- `@clientName` matching the source name => compliant because no
  `x-ms-client-name` is emitted
- `@clientName` differing from the source name => compliant rename scenario

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `client-name-same-as-property` | true | Raw `x-ms-client-name` on a property matches the source property name |
| `client-name-same-as-param` | true | Raw `x-ms-client-name` on a parameter matches the source parameter name |
| `client-name-same-via-client-name` | false | Canonical `@clientName("name")` omits the redundant OpenAPI extension |
| `client-name-different-via-client-name` | false | Canonical `@clientName("wireName")` emits a non-redundant client name |
