Nested ARM resources must provide an operation that lists instances of that nested resource
within a specific containing resource.

For example, `Widget` is a top-level resource and `Part` is a nested resource declared with
`@parentResource(Widget)`. The required operation lists `Part` instances belonging to one `Widget`:

| Request                                         | Purpose                                  |
| ----------------------------------------------- | ---------------------------------------- |
| `GET .../widgets`                               | List top-level `Widget` instances.       |
| `GET .../widgets/{widgetName}/parts`            | List nested `Part` instances: required.  |
| `GET .../widgets/{widgetName}/parts/{partName}` | Get one `Part`; does not replace a list. |

Here, "parent" means the containing resource: `Widget` is the parent of `Part`.
It is not another name for "top-level resource". A nested resource can also contain
another nested resource, such as `Gallery` > `GalleryApplication` > `GalleryApplicationVersion`.
Listing application versions does not replace listing applications in a gallery.

Add `ArmResourceListByParent<Part>` alongside the `Part` lifecycle operations to provide the
required list.

This initial implementation checks resource identities and instance operations returned by
`resolveArmResources`. Unregistered custom resources and REST-only instance routes missing from
that graph are not checked. The intentional exclusion of `CustomAzureProxyResource<false>` is discussed in
[typespec-azure#4798](https://github.com/Azure/typespec-azure/issues/4798).
Legacy-specific test coverage is temporarily deferred.

This rule applies to nested resources with lifecycle operations at resource-group, subscription,
or location scope, including read-only and singleton resources. It does not require lists for
top-level resources, unused resource declarations, action-only resources, or tenant/extension scopes.
Top-level list requirements are separate policies. Listing `Widget` instances, another resource type,
or `Part` instances across a subscription does not replace listing `Part` instances within one `Widget`.

The collection GET must appear in the resource's resolved `operations.lists`. Registered list
operations can be authored on another interface. They must return a successful response with a
`value` array; the items may use a separate collection representation of the resource.

Collections authored only as actions are not recognized unless the resolver exposes them as lists.
This can produce a warning even when the HTTP collection GET exists. Collection associations are
tracked in [typespec-azure#5080](https://github.com/Azure/typespec-azure/issues/5080), and a dropped
parent-action operation is tracked in
[typespec-azure#5886](https://github.com/Azure/typespec-azure/issues/5886).
Equivalent-path read and create/update identities can also receive different list associations;
see [typespec-azure#5899](https://github.com/Azure/typespec-azure/issues/5899).
This rule does not work around those helper limitations.

The rule evaluates source declarations, consistent with existing missing-operation rules.
It does not check operation availability separately for each API version. General version-aware
detection, reporting, and suppression are tracked in
[typespec-azure#5875](https://github.com/Azure/typespec-azure/issues/5875).

## Impact

- **Area:** API

Clients cannot discover instances of the nested resource within a containing resource without this list operation.
The rule reports one warning per resource on its lifecycle operation interface, or on its model
when the lifecycle operation is not in an interface.

The rule is disabled by default, including in the package's `all` ruleset. Enable
`@azure-tools/typespec-azure-resource-manager/nested-resource-missing-list` explicitly to adopt it.

## ❌ Incorrect

`Part` has individual-resource operations but no operation to list `Part` instances within one `Widget`:

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

Add an operation that lists `Part` instances belonging to the specified `Widget`:

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
using subscription-prefixed routes and response-schema associations. The native rule requires a list
of nested-resource instances within their directly containing resource; a collection at another scope
does not satisfy this rule.
These intentional metadata and diagnostic-unit differences do not imply exact Swagger-count parity.
