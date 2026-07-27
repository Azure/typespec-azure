---
validatorRuleId: GetMustNotHaveRequestBody
engine: spectral
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
---

# GetMustNotHaveRequestBody

**Severity:** error

**Applies to:** Resource Manager (ARM)

Standard ARM GET templates do not accept request bodies. The earlier violating repro only existed
after suppressing `@azure-tools/typespec-azure-resource-manager/arm-resource-operation` to author a
raw custom GET operation, so the rule is template-enforced locally.
