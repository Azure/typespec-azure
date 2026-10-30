Per [ARM guidelines](https://github.com/Azure/azure-resource-manager-rpc/blob/master/v1.0/resource-api-reference.md), all the nested must have a list operation which returns the collection of the resource.

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

This rule applies to nested resources at resource-group, subscription, or location scope,
including read-only and singleton resources. Top-level list requirements are separate policies.
Listing `Widget` instances, another resource type,
or `Part` instances across a subscription does not replace listing `Part` instances within one `Widget`.

Define the list operation in the same service as the nested resource operations. It must use GET
and return a successful 2xx response. Use `ArmResourceListByParent<Part>` rather than an action
returning a collection.

## Impact

- **Area:** API

Clients cannot discover instances of the nested resource within a containing resource without this list operation.

The rule is disabled by default, including in the package's `all` ruleset. Enable
`@azure-tools/typespec-azure-resource-manager/nested-resources-must-have-list-operation` explicitly to adopt it.

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
