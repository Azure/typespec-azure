---
validatorRuleId: GetOperationMustNotBeLongRunning
engine: spectral
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
  - '@azure-tools/typespec-azure-core/no-openapi'
---

# GetOperationMustNotBeLongRunning

**Severity:** error

**Applies to:** Resource Manager (ARM)

GET LROs are not authorable through standard ARM templates, and the old repro required both
`@azure-tools/typespec-azure-resource-manager/arm-resource-operation` suppression to bypass the
template path and `@azure-tools/typespec-azure-core/no-openapi` suppression to inject the raw
`x-ms-long-running-operation` extension. Treat this as suppression-dependent/template-enforced.
