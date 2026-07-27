---
validatorRuleId: LroStatusCodesReturnTypeSchema
engine: spectral
tspLints: []
coverageKind: blocked
---

# LroStatusCodesReturnTypeSchema

**Severity:** error

**Applies to:** Both ARM and DataPlane

Treat this case as **blocked / suppression-dependent** locally. The repro needs
`no-response-body`, `no-openapi`, and `arm-resource-operation` suppressions
before TypeSpec will emit the empty 200/201 LRO responses that the validator
checks.
