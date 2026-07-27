---
validatorRuleId: PathContainsResourceType
engine: spectral
tspLints: []
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
---

# PathContainsResourceType

**Severity:** error

**Applies to:** Resource Manager (ARM)

Resource CRUD paths must contain a literal resource type segment after the provider namespace.

TypeSpec ARM templates generate this correctly. When authors bypass the standard ARM resource
operation model with a raw CRUD path, TypeSpec emits
`@azure-tools/typespec-azure-resource-manager/arm-resource-operation`, which is a useful proxy
signal that they are no longer using the ARM template shape that guarantees this path segment.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-resource-type` | yes | Raw ARM-style PUT path places a parameter where the resource type segment should be |
