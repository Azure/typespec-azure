Top-level resource-group ARM resources must define an operation that lists their instances
within a resource group. A subscription-wide list does not replace this operation.

The rule uses `resolveArmResources` to check resolved resource scopes and collection routes.
It applies to tracked and proxy resources identified by resource-group GET or PUT operations.
Nested resources, resources at other scopes, unused models, and
action-only resources are outside this rule's scope.

The current resolver does not discover resource identities from PATCH-only operations, so
this initial implementation does not check PATCH-only resources. It adds no fallback
discovery or changes to the shared resolver.

This rule is opt-in and disabled in the ARM `all` and Azure resource-manager rulesets.
Enable `@azure-tools/typespec-azure-resource-manager/top-level-resources-list-by-resource-group`
explicitly.

## Incorrect

```typespec
@armProviderNamespace
@service
namespace Microsoft.Contoso;

model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}
```

## Correct

```typespec
@armProviderNamespace
@service
namespace Microsoft.Contoso;

model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}
```

The examples assume the ARM library and its usual `Http`, `Rest`, `Versioning`, and
`Azure.ResourceManager` namespaces are imported.

## LintDiff Equivalent

This rule corresponds to
[TopLevelResourcesListByResourceGroup](https://github.com/Azure/azure-openapi-validator/blob/main/docs/top-level-resources-list-by-resource-group.md)
([Swagger implementation](https://github.com/Azure/azure-openapi-validator/blob/18a7944e7fc3155e8ef1498665465ed5f455f54a/packages/rulesets/src/native/legacyRules/TopLevelResourcesListByResourceGroup.ts)),
ARM guideline RPC-Get-V1-05.

Unlike Swagger schema-name matching, this rule uses resolved native resource identities.
Full corpus comparison and migration-equivalence assessment are deferred for this draft.
