---
validatorRuleId: NonEmptyClientName
engine: spectral
tspLints: []
coverageKind: blocked
---

# NonEmptyClientName

**Severity:** error

**Applies to:** Both ARM and DataPlane

x-ms-client-name must not be empty.

Treat this case as **blocked / suppression-dependent** locally. Canonical
`@clientName("")` authoring emits no `x-ms-client-name`, so the validator sad
path only appears when raw `@extension("x-ms-client-name", "")` is used under
`@azure-tools/typespec-azure-core/no-openapi` suppression.

| ID          | Violation | Description                                        |
| ----------- | --------- | -------------------------------------------------- |
| `compliant` | false     | Standard TypeSpec compiles without violating rule   |
