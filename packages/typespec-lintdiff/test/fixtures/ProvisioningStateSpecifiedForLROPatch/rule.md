---
validatorRuleId: ProvisioningStateSpecifiedForLROPatch
engine: spectral
tspLints: []
coverageKind: blocked
---

# ProvisioningStateSpecifiedForLROPatch

**Severity:** error

**Applies to:** Resource Manager (ARM)

Treat this case as **blocked / suppression-dependent** locally. The violating
PATCH response requires a raw LRO operation with `no-openapi` and
`arm-resource-operation` suppressions instead of standard ARM update templates.
