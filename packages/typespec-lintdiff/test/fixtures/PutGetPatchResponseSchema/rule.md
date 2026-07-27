---
validatorRuleId: PutGetPatchResponseSchema
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response'
coverageKind: partial
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response'
---

# PutGetPatchResponseSchema

**Severity:** error

**Applies to:** Resource Manager (ARM)

PUT, GET, and PATCH on the same path must return the same response schema.

TypeSpec currently has an ARM-specific lint for standard resource operations that return a
different ARM resource model. Raw same-path mismatches outside the
`@armResourceOperations` template path are only accompanied by the ARM template-bypass signal
`@azure-tools/typespec-azure-resource-manager/arm-resource-operation`, so this rule remains
intentionally partial rather than a clean standalone native-lint gap.

| ID                        | Violation | Description                                                  |
| ------------------------- | --------- | ------------------------------------------------------------ |
| `raw-response-mismatch`   | true      | Raw same-path GET/PUT responses use different models         |
| `arm-resource-mismatch`   | true      | ARM resource operations return different ARM resource models |
