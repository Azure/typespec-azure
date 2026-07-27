---
validatorRuleId: ProvisioningStateSpecifiedForLROPut
engine: spectral
tspLints: []
coverageKind: blocked
---

# ProvisioningStateSpecifiedForLROPut

**Severity:** error

**Applies to:** Resource Manager (ARM)

Treat this case as **blocked / suppression-dependent** locally. The violating
PUT response requires a raw LRO operation with `no-openapi` and
`arm-resource-operation` suppressions instead of standard ARM create/update
templates.
