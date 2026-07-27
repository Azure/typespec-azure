---
validatorRuleId: TopLevelResourcesListBySubscription
engine: native
tspLints: []
---

# TopLevelResourcesListBySubscription

**Severity:** error

**Applies to:** Resource Manager (ARM)

Checks that top-level tracked resources have a list-by-subscription operation.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-list-by-sub` | yes | Top-level resource with list-by-resource-group but no list-by-subscription |
