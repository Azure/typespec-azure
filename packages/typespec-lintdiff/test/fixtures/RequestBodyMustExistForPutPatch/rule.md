---
validatorRuleId: RequestBodyMustExistForPutPatch
engine: spectral
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
---

# RequestBodyMustExistForPutPatch

**Severity:** error

**Applies to:** Resource Manager (ARM)

Standard ARM PUT/PATCH templates require request bodies. The previous violating case only existed
after suppressing `@azure-tools/typespec-azure-resource-manager/arm-resource-operation` to author a
raw body-less PUT, so the local migration outcome is template-enforced.
