---
validatorRuleId: DeleteMustNotHaveRequestBody
engine: spectral
tspLints: []
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
---

# DeleteMustNotHaveRequestBody

**Severity:** error

**Applies to:** Resource Manager (ARM)

DELETE operations must not accept a request body.

TypeSpec ARM templates generate body-less resource deletes. When authors bypass that pattern with a
custom delete-shaped ARM action, TypeSpec emits
`@azure-tools/typespec-azure-resource-manager/arm-resource-operation`, which is a useful proxy
signal that they are no longer using the standard ARM delete operation shape.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `delete-with-body` | yes | Custom delete-shaped ARM action includes a request body |
