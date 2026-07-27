---
validatorRuleId: XmsClientNameParameter
engine: spectral
tspLints: []
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-core/no-openapi'
tspRuleset: data-plane
---

# XmsClientNameParameter

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

OpenAPI parameters should not carry a redundant `x-ms-client-name` value that
matches the wire name exactly.

## Source-of-truth notes

- Upstream `azure-openapi-validator` registers this as a Spectral warning over
  OpenAPI 2.0 parameter objects at the operation, path-item, and global
  parameter levels.
- The Spectral function only reports when a parameter's `name` and
  `x-ms-client-name` strings are exactly equal.

## Authorability notes

- The native TypeSpec authoring surface for parameter renames is
  `@clientName(...)` from `@azure-tools/typespec-client-generator-core`.
- In the local harness, a redundant authoring pattern such as
  `@clientName("search") search: string` does **not** emit
  `x-ms-client-name` at all, so the generated OpenAPI never reaches the
  upstream validator's sad path.
- The previous raw-OpenAPI repro relied on `@extension("x-ms-client-name", ...)`,
  which also triggered `@azure-tools/typespec-azure-core/no-openapi`.
- Treat this rule as **template-enforced** in the local migration inventory:
  native authoring omits the redundant extension instead of needing a dedicated
  local lint.

## Test Cases

| ID                          | Violation | Description |
| --------------------------- | --------- | ----------- |
| `client-name-same-as-param` | false     | Redundant `@clientName` is omitted from emitted OpenAPI, so no `x-ms-client-name` reaches the validator. |
