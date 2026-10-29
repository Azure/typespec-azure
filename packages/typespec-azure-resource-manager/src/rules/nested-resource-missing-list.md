Nested ARM resources must provide a list operation at their immediate parent collection.
Clients need to discover the children of a resource without knowing their names in advance.
Add `ArmResourceListByParent<Child>` alongside the child's lifecycle operations.

This rule applies to nested resources with lifecycle operations at resource-group, subscription,
or location scope, including read-only and singleton resources. It does not require lists for
top-level resources, unused resource declarations, action-only resources, or tenant/extension scopes.
A list of the parent, another resource, or all children across a subscription does not replace the
child's immediate parent collection list.

The collection GET can use a standard list template or be authored on another interface,
including as an action on the parent. It must return a successful response with a `value` array;
the array items may use a separate collection representation of the resource.

The rule evaluates source declarations, consistent with existing missing-operation rules.
It does not check operation availability separately for each API version. General version-aware
detection, reporting, and suppression are tracked in
[typespec-azure#5875](https://github.com/Azure/typespec-azure/issues/5875).

## Impact

- **Area:** API

Clients cannot enumerate children when their parent collection has no list operation.
The rule reports one warning per resource on its lifecycle operation interface, or on its model
when the lifecycle operation is not in an interface.

The rule is disabled by default, including in the package's `all` ruleset. Enable
`@azure-tools/typespec-azure-resource-manager/nested-resource-missing-list` explicitly to adopt it.

## ❌ Incorrect

This child has instance operations but no parent collection list:

```typespec
@armProviderNamespace
@service
namespace Microsoft.Contoso;

model WidgetProperties {
  label?: string;
}
model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}
@parentResource(Widget)
model Part is ProxyResource<WidgetProperties> {
  ...ResourceNameParameter<Part>;
}

@armResourceOperations
interface Parts extends ResourceInstanceOperations<Part, WidgetProperties> {}
```

## ✅ Correct

Add the parent collection list to the same child's operations:

```typespec
@armProviderNamespace
@service
namespace Microsoft.Contoso;

model WidgetProperties {
  label?: string;
}
model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}
@parentResource(Widget)
model Part is ProxyResource<WidgetProperties> {
  ...ResourceNameParameter<Part>;
}

@armResourceOperations
interface Parts extends ResourceInstanceOperations<Part, WidgetProperties> {
  listByParent is ArmResourceListByParent<Part>;
}
```

The examples assume the ARM library and its usual `Http`, `Rest`, `Versioning`, and
`Azure.ResourceManager` namespaces are imported.

## LintDiff Equivalent

This rule corresponds to
[NestedResourcesMustHaveListOperation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/nested-resources-must-have-list-operation.md).
The native rule reports a warning per authored resource using ARM/REST resource-operation
metadata and HTTP collection routes. The Swagger validator reports an error per discovered model name
using subscription-prefixed routes and response-schema associations. Native lists must serve the
immediate parent collection; a collection at another scope does not satisfy this rule.
These intentional metadata and diagnostic-unit differences do not imply exact Swagger-count parity.
