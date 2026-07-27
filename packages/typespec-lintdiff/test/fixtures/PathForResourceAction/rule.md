---
validatorRuleId: PathForResourceAction
engine: spectral
tspLints: []
coverageKind: blocked
---

# PathForResourceAction

**Severity:** error

**Applies to:** Resource Manager (ARM)

Resource action POST paths must end with a valid action name segment.

Treat this case as **blocked / suppression-dependent** locally. The bad path is
authored as a standalone provider-level POST only after suppressing
`operation-missing-api-version` and `arm-resource-operation`.

| ID                | Violation | Description                                   |
| ----------------- | --------- | --------------------------------------------- |
| `bad-action-path` | true      | POST action path does not end with action name |
