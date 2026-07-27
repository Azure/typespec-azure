---
validatorRuleId: PathForTrackedResourceTypes
engine: spectral
tspLints: []
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
---

# PathForTrackedResourceTypes

**Severity:** error

**Applies to:** Resource Manager (ARM)

Tracked (non-proxy) resource types must have paths under subscription/resource group scope
(`/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/...`).

TypeSpec ARM templates put tracked resources in the correct ARM scope automatically. The local
violating fixture therefore uses a raw ARM-style resource operation outside the standard
`@armResourceOperations` model, and
`@azure-tools/typespec-azure-resource-manager/arm-resource-operation` is the repository's proxy
signal that the author has stepped outside the template path that guarantees the correct tracked-
resource scope.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-subscription-scope` | yes | Raw tracked resource path is defined at tenant scope |
