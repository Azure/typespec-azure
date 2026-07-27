---
validatorRuleId: PathForNestedResource
engine: spectral
tspLints: []
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
---

# PathForNestedResource

**Severity:** error

**Applies to:** Resource Manager (ARM)

Nested resources must have a proper path hierarchy under their parent resource.

TypeSpec ARM templates with `@parentResource` generate proper nested paths. When authors
bypass those patterns with raw ARM-style operations, `arm-resource-operation` is a useful
proxy signal that they are no longer using the standard ARM resource operation model.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `incorrect-nesting` | yes | Raw ARM-style operation uses an incorrectly nested static child path |
