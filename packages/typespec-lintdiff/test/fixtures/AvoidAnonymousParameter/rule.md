---
validatorRuleId: AvoidAnonymousParameter
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/avoid-anonymous-parameter
coverageKind: lint
---

# AvoidAnonymousParameter

**Severity:** error

**Applies to:** Both ARM and DataPlane

Parameter schemas must not be anonymous.

The local fixture's `use-standard-operations` suppression is ambient rather than
prerequisite-blocking: inline `@body { ... }` authoring still compiles and emits
an anonymous body schema. This rule is now covered by
`tsp-lintdiff-local-linter/avoid-anonymous-parameter`.

| ID          | Violation | Description                                        |
| ----------- | --------- | -------------------------------------------------- |
| `compliant` | false     | Standard TypeSpec compiles without violating rule   |
