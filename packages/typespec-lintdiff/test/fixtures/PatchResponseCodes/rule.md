---
validatorRuleId: PatchResponseCodes
engine: spectral
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
---

# PatchResponseCodes

**Severity:** error

**Applies to:** Resource Manager (ARM)

Standard ARM PATCH templates emit the allowed PATCH response codes. The old violation required a
raw custom PATCH operation outside the template path with
`@azure-tools/typespec-azure-resource-manager/arm-resource-operation` suppressed, so this remains
template-enforced.
