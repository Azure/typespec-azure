---
validatorRuleId: XmsClientNameProperty
engine: spectral
tspLints: []
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-core/no-openapi'
tspRuleset: data-plane
---

# XmsClientNameProperty

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Flags redundant property-level `x-ms-client-name` values that exactly match the
wire property name.

## Source-of-truth notes

- Upstream registers this as a Spectral **warning** in the common ruleset, then
  carries it into both ARM and data-plane bundles.
- The actual selector is `$.definitions[*].properties.*['x-ms-client-name']`.
  Despite the doc/message wording ("Property/Model"), schema-level
  `x-ms-client-name` is not inspected.
- The Spectral function reports only when the extension value is a string
  exactly equal to the containing property key.
- Upstream tests cover one violating cell plus compliant cells for a different
  client name and an absent extension.

## Authorability notes

- Canonical TypeSpec authoring uses `@clientName(...)` from
  `@azure-tools/typespec-client-generator-core`, not raw
  `@extension("x-ms-client-name", ...)`.
- When `@clientName("name")` matches the property name, the AutoRest emitter
  omits `x-ms-client-name` entirely, so the redundant OpenAPI sad path is never
  produced.
- When authors bypass that native path with raw `@extension`, TypeSpec already
  reports `@azure-tools/typespec-azure-core/no-openapi`.
- No stronger direct/native lint path was found for this rule. The trustworthy
  local outcome remains **template-enforced / emitter-enforced**.

## Semantic coverage notes

The local suite covers the authorable upstream matrix plus the key
doc-versus-implementation selector boundary:

- raw `@extension("x-ms-client-name", "name")` => validator violation plus
  `no-openapi`
- raw model-level `@extension("x-ms-client-name", "Widget")` => ignored by the
  validator because the selector never reaches schema-level extensions
- `@clientName("name")` => compliant; emitter drops the redundant extension
- `@clientName("renamedName")` => compliant; emitter produces a meaningful
  `x-ms-client-name`
- no client-name decorator => compliant

## Test Cases

| ID                             | Violation | Description |
| ------------------------------ | --------- | ----------- |
| `client-name-same-as-property` | true      | Raw property-level `@extension` reproduces the upstream violation and is flagged by `no-openapi` |
| `model-level-client-name-ignored` | false  | Raw model-level `@extension` proves the upstream selector ignores schema-level `x-ms-client-name` |
| `redundant-client-name`        | false     | Native `@clientName("name")` is normalized away, so no invalid extension is emitted |
| `renamed-client-name`          | false     | Native `@clientName("renamedName")` emits a compliant `x-ms-client-name` |
| `without-client-name`          | false     | Property without client-name customization remains compliant |
