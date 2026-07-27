---
validatorRuleId: MutabilityWithReadOnly
engine: spectral
coverageKind: partial
tspLints:
  - tsp-lintdiff-local-linter/mutability-with-read-only
---

# MutabilityWithReadOnly

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

When a property is marked as `readOnly: true`, the `x-ms-mutability` must be `["read"]` only.
Conflicting mutability values with readOnly indicate an inconsistent schema.

## Current fixture note

Every local repro that exercises `x-ms-mutability` uses `@extension("x-ms-mutability", ...)`, which
requires suppressing `@azure-tools/typespec-azure-core/no-openapi`. The local rule added here is
therefore intentionally a **defense-in-depth** lint: once an author has chosen to suppress
`no-openapi` and manually configure `x-ms-mutability`, they should still get a targeted warning if a
readonly property uses an invalid mutability array.

The fixtures were tightened to use `Azure.Core.ResourceOperations`, so this rule no longer depends on
`use-standard-operations` or other unrelated suppressions. The decisive prerequisite is still
`no-openapi`: without suppressing it, TypeSpec authors cannot express the `x-ms-mutability`
extension that the validator inspects.

## Semantic coverage notes

The upstream semantic matrix includes:

- `readOnly: true` with `["read"]` => valid
- `readOnly: true` with any other non-empty mutability array => invalid
- `readOnly: false` with `["read"]` => invalid
- `readOnly: false` with other mutability arrays => valid
- missing or empty rule inputs => ignored
- null properties => ignored

The local suite now covers:

- the valid `readOnly: true` / `["read"]` case
- multiple invalid `readOnly: true` mutability combinations
- ignored cases where the selector should not apply, including the neither-field case

The `readOnly: false` branches are not directly authorable because the current TypeSpec/OpenAPI flow
emits `readOnly: true` when needed but does not emit an explicit `readOnly: false`. The `null`
property case from the upstream test is also not authorable as a TypeSpec model property. The
`only-mutability` fixture is therefore an ignored selector-boundary control, not evidence for the
upstream `readOnly: false` branch. Because the missing cells are upstream-semantic cells rather than
mere fixture variants, this local rule should be treated as **partial coverage**, not full
equivalence.

Focused validation should now report both violating fixtures through
`tsp-lintdiff-local-linter/mutability-with-read-only`, while still documenting that the broader
upstream rule has unrepresentable semantic cells.

## Test Cases

| ID                          | Violation | Description                                                     |
| --------------------------- | --------- | --------------------------------------------------------------- |
| `conflicting-mutability`    | true      | readOnly property with conflicting `["read", "create"]` values  |
| `update-only-mutability`    | true      | readOnly property with `["update"]` mutability                  |
| `read-only-valid`           | false     | readOnly property with `["read"]` mutability                    |
| `empty-mutability`          | false     | readOnly property with empty mutability array is ignored        |
| `only-readonly`             | false     | Property with readOnly only is ignored                          |
| `only-mutability`           | false     | Property with x-ms-mutability only emits no `readOnly`, so the selector ignores it |
| `neither-field`             | false     | Property with neither readOnly nor x-ms-mutability is ignored   |
