Per [ARM guidelines](https://github.com/Azure/azure-resource-manager-rpc/blob/master/v1.0/resource-api-reference.md), all the nested must have a list operation which returns the collection of the resource.

For example, `Widget` is a top-level resource and `Part` is a nested resource declared with
`@parentResource(Widget)`. An operation can list `Part` instances belonging to one `Widget`:

| Request                                         | Purpose                                  |
| ----------------------------------------------- | ---------------------------------------- |
| `GET .../widgets`                               | List top-level `Widget` instances.       |
| `GET .../widgets/{widgetName}/parts`            | List nested `Part` instances by parent.  |
| `GET .../widgets/{widgetName}/parts/{partName}` | Get one `Part`; does not replace a list. |

Here, "parent" means the containing resource: `Widget` is the parent of `Part`.
It is not another name for "top-level resource". A nested resource can also contain
another nested resource, such as `Gallery` > `GalleryApplication` > `GalleryApplicationVersion`.
Listing application versions does not replace listing applications in a gallery.

Add `ArmResourceListByParent<Part>` alongside the `Part` lifecycle operations, or provide
`ArmListBySubscriptionScope<Part>` to list the same resource across the subscription.

This rule applies to nested resources at resource-group, subscription, or location scope,
including read-only and singleton resources. Top-level list requirements are separate policies.
Listing `Widget` instances or another resource type does not satisfy the requirement for `Part`.
A subscription-wide collection for the same resource is sufficient; a parent-specific list
at a different scope is not.

Define the list operation in the same service as the nested resource operations. It must use GET
and return a successful 2xx response. Parent-specific action collections do not replace
registered resource LISTs.

Subscription-wide LISTs use `GET /subscriptions/{subscriptionId}/providers/{namespace}/{collection}`.
The operation must be marked `@list` and identify the resource through REST list metadata or
explicit `@pageItems` metadata whose array items are the resource model. This also covers
provider-level actions such as the deleted-services LIST for `DeletedServiceContract`, whose
individual reads are under `locations/{location}`. The provider namespace, collection and
service must match; an unrelated collection or a LIST in another service is not sufficient.

An operation that borrows a resource model to address a descendant endpoint does not introduce
another resource-level list requirement. For example, a read of
`.../nodes/{nodeId}/reports/{reportId}` authored with `ArmResourceRead<DscNode>` does not make
the report a `DscNode` resource. The actual `DscNode` collection still requires its own list.
This distinction uses the registered resource collection and resolved resource types, not the
response body's shape. Separately declared child resources remain subject to the rule.

## Impact

- **Area:** API

Clients cannot discover instances of the nested resource without a parent-specific or subscription-wide list operation.

The rule is disabled by default, including in the package's `all` ruleset. Enable
`@azure-tools/typespec-azure-resource-manager/nested-resources-must-have-list-operation` explicitly to adopt it.

## ❌ Incorrect

`Part` has individual-resource operations but no parent-specific or subscription-wide LIST:

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
