---
validatorRuleId: ParameterNotUsingCommonTypes
engine: spectral
tspLints: []
tspRuleset: resource-manager
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
  - '@azure-tools/typespec-azure-core/operation-missing-api-version'
---

# ParameterNotUsingCommonTypes

**Severity:** warning

**Applies to:** Resource Manager (ARM)

Common parameters (subscriptionId, resourceGroupName, api-version) must use $ref to common-types.

**Classification:** Template-enforced — ARM TypeSpec library automatically injects common-types parameter references via standard operations. The violation requires raw HTTP ops, which `arm-resource-operation` and `operation-missing-api-version` already flag. See `notes/non-migrated-rules.md` for full rationale.

| ID          | Violation | Description                                           |
| ----------- | --------- | ----------------------------------------------------- |
| `compliant` | false     | ARM library correctly uses common-types references    |
