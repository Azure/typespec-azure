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
an anonymous body schema. The existing official
`@azure-tools/typespec-azure-core/no-unnamed-types` rule already covers this
direct-body case. Its request-template extension is tracked separately from the
temporary local rule; neither rule is an exact substitute for Swagger's
dictionary-schema checks. See [migration evidence](./migration.md).

| ID           | Violation | Description                                                     |
| ------------ | --------- | --------------------------------------------------------------- |
| `compliant`  | true      | Historical directory name; an inline request body violates      |
| `named-body` | false     | A named request model is accepted by TypeSpec and the validator |

The named-body control explicitly records three ambient diagnostics about security
description, operation naming, and example coverage. None changes the request
model shape or suppresses this rule; the target validator and both request-name
linters are absent.
