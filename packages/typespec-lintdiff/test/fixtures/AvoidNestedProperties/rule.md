---
validatorRuleId: AvoidNestedProperties
engine: spectral
tspLints: []
coverageKind: blocked
---

# AvoidNestedProperties

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Nested properties can result in a bad user experience especially when creating request objects.
`x-ms-client-flatten` flattens the model properties so that users can analyze and set properties more easily.

**Classification:** Intentionally not migrated — TypeSpec deliberately does not support `x-ms-client-flatten`. The TypeSpec design philosophy encourages better model composition (named models, `spread`, `extends`) instead of client-side flattening. A TypeSpec-native rule could warn on excessive anonymous inline nesting, but that would be a different rule with different semantics than the original. See `notes/non-migrated-rules.md` for full rationale.

## Test Cases

| ID                         | Violation | Description                                              |
| -------------------------- | --------- | -------------------------------------------------------- |
| `deeply-nested-properties` | true      | Model with deeply nested object properties without flatten |
