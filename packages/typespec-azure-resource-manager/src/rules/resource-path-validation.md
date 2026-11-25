ARM HTTP paths must identify resource types consistently, use valid nested-resource paths, and identify the correct provider. Tracked resources must be routed under a subscription and resource group.

The rule checks GET, PUT, PATCH, and DELETE paths for resource-type and nested-path requirements. Provider namespace casing and provider-to-service matching apply to all paths, regardless of HTTP method. For tracked-resource scope, the rule uses ARM resource metadata to identify tracked resource models and checks their GET and PUT operations.

## Impact

- **Area:** API, SDK

## ❌ Incorrect

### Resource type and provider namespace

This GET path has no resource type after the provider namespace, and its provider namespace does not match the ARM service namespace:

```tsp
@armProviderNamespace("Microsoft.Contoso")
namespace Microsoft.Contoso {
  @route("/providers/Microsoft.Other")
  @get
  op read(): void;
}
```

### Nested resource path

A nested resource path must use resource type/name pairs; an action segment cannot stand in for the nested resource name:

```tsp
@armProviderNamespace
namespace Microsoft.Contoso {
  @route("/providers/Microsoft.Contoso/widgets/{widgetName}/parts/action")
  @get
  op read(@path widgetName: string): void;
}
```

### Tracked resource scope

A tracked resource cannot use a subscription-only path:

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, BaseParameters = SubscriptionBaseParameters>;
}
```

### Provider namespace casing

Provider namespaces must use PascalCase:

```tsp
@armProviderNamespace("Microsoft.contoso")
namespace Microsoft.Contoso {
  @route("/providers/Microsoft.contoso/widgets")
  @post
  op create(): void;
}
```

## ✅ Correct

### Resource type, nested path, scope, and provider namespace

The ARM namespace matches the provider in the path. Standard resource templates produce named resource-type segments and tracked paths with subscription and resource-group scope:

```tsp
@armProviderNamespace
namespace Microsoft.Contoso {
  model Widget is TrackedResource<{}> {
    ...ResourceNameParameter<Widget>;
  }
  @armResourceOperations
  interface Widgets {
    read is ArmResourceRead<Widget>;
  }
}
```

## Provider namespaces

Provider namespace casing follows the ARM path convention. Every provider segment in a path is checked. The final provider segment must match the ARM namespace declared for the service, including on extension paths. A service may set an explicit namespace with `@armProviderNamespace("Microsoft.Contoso")`.

## LintDiff Equivalent

This rule covers [PathContainsResourceType](https://github.com/Azure/azure-openapi-validator/blob/main/docs/path-contains-resource-type.md), [PathForNestedResource](https://github.com/Azure/azure-openapi-validator/blob/main/docs/path-for-nested-resource.md), [PathForTrackedResourceTypes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/path-for-tracked-resource-types.md), [PathResourceProviderNamePascalCase](https://github.com/Azure/azure-openapi-validator/blob/main/docs/path-resource-provider-name-pascal-case.md), and [PathResourceProviderMatchNamespace](https://github.com/Azure/azure-openapi-validator/blob/main/docs/path-resource-provider-match-namespace.md).

Tracked resources are identified through TypeSpec ARM resource metadata, rather than inferring tracked status from a `location` property in an HTTP payload. Provider-to-service matching uses the declared ARM namespace rather than a Swagger source-file directory.
