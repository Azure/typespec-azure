ARM PUT operations create or replace a resource instance. Their HTTP paths must
end in resource type/name pairs after the provider namespace, such as
`/providers/Microsoft.Contoso/widgets/{widgetName}`. A singleton may use the
literal name `default`, and nested resources add further type/name pairs.

A provider root, collection path, or action-like suffix such as
`/widgets/{widgetName}/configure` is not a resource instance path for PUT.
Prefer standard ARM resource operation templates, which construct resource paths
for you. This rule also checks custom PUT operations when explicitly enabled.

The rule checks resolved HTTP paths on project operations, including ordinary
and nested namespaces without a provider decorator. It excludes imported library
declarations, template instances, and operations in uninstantiated template
interfaces. It does not filter operations by SDK language scope.

## Impact

- **Area:** API, SDK

Using PUT for a collection or action endpoint obscures the identity of the
resource being created or replaced and gives generated SDKs an inconsistent
resource-management contract.

## ❌ Incorrect

```tsp
@route("/providers/Microsoft.Contoso/widgets")
@put
op createWidget(@body widget: Widget): Widget;

model Widget {
  displayName: string;
}
```

## ✅ Correct

Prefer a standard ARM create-or-replace template, which constructs the resource
instance path from the resource model:

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
}
```

When a custom PUT operation is necessary, include the resource name after the
resource type:

```tsp
@route("/providers/Microsoft.Contoso/widgets/{widgetName}")
@put
op createWidget(@path widgetName: string, @body widget: Widget): Widget;

model Widget {
  displayName: string;
}
```

## Suppression

Suppress this rule only for a reviewed legacy ARM contract whose PUT path cannot
be changed, or a client-only operation that is not part of the service's ARM
surface. Document the reason on the operation. For new APIs, use a resource
instance path rather than suppressing a collection or action-like PUT.

## LintDiff Equivalent

This rule corresponds to
[EvenSegmentedPathForPutOperation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/even-segmented-path-for-put-operation.md).
It preserves the validator's provider/resource suffix pattern rather than
counting every segment in the entire path. SDK-scoped TypeSpec operations that
are absent from retained Swagger can still receive a diagnostic.
