---
validatorRuleId: RequiredDefaultResponse
engine: native
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
---

# RequiredDefaultResponse

**Severity:** error

**Applies to:** Resource Manager (ARM)

Standard ARM templates emit the default error response. The earlier violating repro only existed
after suppressing `@azure-tools/typespec-azure-resource-manager/arm-resource-operation` to author a
raw custom operation without the default response, so this is tracked as template-enforced.
