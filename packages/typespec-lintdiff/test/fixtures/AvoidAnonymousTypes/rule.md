---
validatorRuleId: AvoidAnonymousTypes
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/avoid-anonymous-types
coverageKind: lint
---

# AvoidAnonymousTypes

**Severity:** error

**Applies to:** Both ARM and DataPlane

Types should not be anonymous.

The local fixture's `use-standard-operations` suppression is ambient rather than
prerequisite-blocking: an inline response model still compiles and emits an
anonymous success schema. This rule is now covered by
`tsp-lintdiff-local-linter/avoid-anonymous-types`.

| ID          | Violation | Description                                        |
| ----------- | --------- | -------------------------------------------------- |
| `compliant` | false     | Standard TypeSpec compiles without violating rule   |
