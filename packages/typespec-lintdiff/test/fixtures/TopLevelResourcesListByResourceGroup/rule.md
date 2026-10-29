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

For a resource with an instance operation, add `ArmResourceListByParent` to
list its instances in their resource group. A subscription-wide list does not
replace this operation. Child resources and subscription, tenant, or extension
scopes are outside this rule's responsibility.

## Incorrect

Given a top-level resource-group `Widget`:

```typespec
@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}
```

## Correct

```typespec
@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
}
```

## Native rule contract

The rule uses ARM resource and operation registration, supported native HTTP
operation metadata, and REST parent metadata. It reports once on the resource
model when a lifecycle endpoint has a top-level resource-group route and no
registered collection list has that scope. Child resources and models without
instance operations are not checked. The actual operation scope takes precedence
over the resource model's default scope; all declared operations are considered,
including multiple scopes using the same model. Resource-group path casing and
parameter names do not affect the check. There is no provider-namespace presence
guard: registered ARM resources supply the semantic audience boundary.

The temporary package registers and enables this rule in `all`. Its intended
official owner is Azure Resource Manager. Existing `arm-resource-operation`
validates declared endpoints, not the presence of a list; ARM templates generate
a correct list only when the author declares one. The RPC coverage inventory
records the missing complete-operation-set check under RPC006.

## LintDiff Equivalent

- [Validator implementation](https://github.com/Azure/azure-openapi-validator/blob/18a7944e7fc3155e8ef1498665465ed5f455f54a/packages/rulesets/src/native/legacyRules/TopLevelResourcesListByResourceGroup.ts)
- [Validator documentation](https://github.com/Azure/azure-openapi-validator/blob/18a7944e7fc3155e8ef1498665465ed5f455f54a/docs/top-level-resources-list-by-resource-group.md)

R4016 / RPC-Get-V1-05 is registered in the common native ruleset with
`openapiType: arm`, not RPaaS. The engine intersects that bitmask with the
caller's selected OpenAPI type. The native rule checks registered resource
semantics, not emitted schema names or the validator's stateful regular
expressions. Its lifecycle-only boundary intentionally does not require lists
for action-only models. See [migration evidence](migration.md) for assessed
agreement and remaining representation/version differences.

## Semantic coverage notes

The authorable semantic matrix covered locally is:

- top-level tracked resource missing list-by-resource-group => invalid
- top-level proxy resource missing list-by-resource-group => invalid
- top-level resource-group resource with list-by-resource-group => valid
- nested resource missing a parent list => valid for this rule
- subscription-scoped top-level resource without list-by-resource-group => valid for this rule

## Test Cases

| ID                                         | Violation | Description                                                                         |
| ------------------------------------------ | --------- | ----------------------------------------------------------------------------------- |
| `missing-list-by-rg`                       | yes       | Top-level resource with list-by-subscription but no list-by-resource-group          |
| `proxy-missing-list-by-rg`                 | yes       | Top-level proxy resource with no list-by-resource-group                             |
| `compliant`                                | no        | Top-level resource-group resource includes list-by-resource-group                   |
| `nested-resource-missing-list`             | no        | Nested resource is outside this rule's scope                                        |
| `subscription-resource-missing-list-by-rg` | no        | Subscription-scoped resource is outside this rule's scope                           |
| `patch-only-missing-list`                  | yes       | A PATCH-only resource is still an instance resource and needs a resource-group list |

The canonical native suite asserts exact model targets for tracked/proxy
violations and PATCH-only regression, a compliant parent-template list,
no-instance-operation and action-only exclusions, child exclusion,
non-resource-group scopes, scope customizations, and mixed-scope resources.
Swagger parity belongs to these comparison fixtures, not the native unit suite.
