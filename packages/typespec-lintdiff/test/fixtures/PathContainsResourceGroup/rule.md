---
validatorRuleId: PathContainsResourceGroup
engine: spectral
tspLints: []
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
---

# PathContainsResourceGroup

**Severity:** error

**Applies to:** Resource Manager (ARM)

Resource group scoped CRUD paths must contain a `resourceGroupName` parameter.

TypeSpec ARM templates generate this correctly. When authors bypass the standard ARM resource
operation model with a raw CRUD path, TypeSpec emits
`@azure-tools/typespec-azure-resource-manager/arm-resource-operation`, which is a useful proxy
signal that they are no longer using the ARM template shape that guarantees this path segment.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-resource-group` | yes | Raw ARM-style PUT path omits the `resourceGroupName` parameter |
