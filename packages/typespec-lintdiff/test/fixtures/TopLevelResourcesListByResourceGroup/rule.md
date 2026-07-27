---
validatorRuleId: TopLevelResourcesListByResourceGroup
engine: native
tspLints:
  - tsp-lintdiff-local-linter/top-level-resources-list-by-resource-group
---

# TopLevelResourcesListByResourceGroup

**Severity:** error

**Applies to:** Resource Manager (ARM)

Checks that top-level resource-group ARM resources have a list-by-resource-group operation.

## Semantic coverage notes

The authorable semantic matrix covered locally is:

- top-level tracked resource missing list-by-resource-group => invalid
- top-level proxy resource missing list-by-resource-group => invalid
- top-level resource-group resource with list-by-resource-group => valid
- nested resource missing a parent list => valid for this rule
- subscription-scoped top-level resource without list-by-resource-group => valid for this rule

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-list-by-rg` | yes | Top-level resource with list-by-subscription but no list-by-resource-group |
| `proxy-missing-list-by-rg` | yes | Top-level proxy resource with no list-by-resource-group |
| `compliant` | no | Top-level resource-group resource includes list-by-resource-group |
| `nested-resource-missing-list` | no | Nested resource is outside this rule's scope |
| `subscription-resource-missing-list-by-rg` | no | Subscription-scoped resource is outside this rule's scope |
