---
validatorRuleId: DeleteResponseBodyEmpty
engine: spectral
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
---

# DeleteResponseBodyEmpty

**Severity:** error

**Applies to:** Resource Manager (ARM)

Standard ARM delete templates do not emit bodies on successful DELETE responses. The previous
repro depended on suppressing `@azure-tools/typespec-azure-resource-manager/arm-resource-operation`
to author a custom delete action with a response body, so this is treated as template-enforced.
