---
validatorRuleId: OperationIdSingleUnderscore
engine: spectral
tspLints: []
coverageKind: blocked
---

# OperationIdSingleUnderscore

**Severity:** error

**Applies to:** Both ARM and DataPlane

OperationId should have at most one underscore.

Treat this case as **blocked / suppression-dependent** locally. Reproducing the
OpenAPI `operationId` string requires raw `@operationId(...)` metadata under
`@azure-tools/typespec-azure-core/no-openapi`, so the validator sad path is not
cleanly authorable through standard TypeSpec conventions.

| ID          | Violation | Description                                        |
| ----------- | --------- | -------------------------------------------------- |
| `compliant` | false     | Standard TypeSpec compiles without violating rule   |
