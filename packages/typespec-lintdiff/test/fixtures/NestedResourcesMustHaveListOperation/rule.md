---
validatorRuleId: NestedResourcesMustHaveListOperation
engine: native
tspLints:
  - tsp-lintdiff-local-linter/nested-resources-must-have-list-operation
coverageKind: lint
---

# NestedResourcesMustHaveListOperation

**Severity:** error

**Applies to:** Resource Manager (ARM)

Checks that nested (child) resources have a list operation defined.

The local lint evaluates ARM resources discovered from TypeSpec ARM metadata and requires
an associated ARM list operation for any nested resource. This matches the authorable ARM
resource pattern in this repo, including resource-group and subscription-scoped parents and
multi-level nesting.

## Semantic coverage notes

The authorable semantic matrix covered locally is:

- nested child resource with get/create/delete but no list => invalid
- nested child resource with `ArmResourceListByParent` => valid
- top-level resource with no list => valid for this rule
- nested child of a subscription-scoped parent with no list => invalid
- grandchild nested resource with no list => invalid

Unrepresentable/raw-OpenAPI-only collection GET shapes that are not modeled as ARM list
operations in TypeSpec are outside this native rule's scope.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-list-operation` | yes | Nested resource with get, create, and delete but no list operation |
| `compliant` | no | Nested resource includes the standard parent list operation |
| `top-level-resource-no-list` | no | Top-level resource without a list operation is outside this rule's scope |
| `subscription-child-missing-list` | yes | Nested child under a subscription-scoped parent still requires a list operation |
| `grandchild-missing-list` | yes | Grandchild resources are also in scope for the nested-list requirement |
