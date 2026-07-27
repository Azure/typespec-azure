---
validatorRuleId: GetCollectionResponseSchema
engine: native
tspLints: []
---

# GetCollectionResponseSchema

**Severity:** error

**Applies to:** Resource Manager (ARM)

Checks that a collection GET response's value array items match the individual GET response schema.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `mismatched-collection-schema` | no | Standard ARM resource with matching collection and individual GET schemas |
