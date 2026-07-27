---
validatorRuleId: RequestSchemaForTrackedResourcesMustHaveTags
engine: spectral
tspLints: []
coverageKind: blocked
---

# RequestSchemaForTrackedResourcesMustHaveTags

**Severity:** error

**Applies to:** Resource Manager (ARM)

Treat this case as **blocked / suppression-dependent** locally. The violating
tracked-like request body is authored through a standalone raw PUT that already
needs `@azure-tools/typespec-azure-resource-manager/arm-resource-operation`
suppression.
