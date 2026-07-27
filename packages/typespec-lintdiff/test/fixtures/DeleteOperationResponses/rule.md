---
validatorRuleId: DeleteOperationResponses
engine: native
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
---

# DeleteOperationResponses

**Severity:** error

**Applies to:** Resource Manager (ARM)

Standard ARM delete templates emit the expected response set. The old violating fixture only worked
by suppressing `@azure-tools/typespec-azure-resource-manager/arm-resource-operation` to author a
raw delete-shaped action outside the template path, so this rule is tracked as template-enforced
rather than a native lint gap.
