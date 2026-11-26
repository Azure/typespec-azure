ARM resource paths must include valid resource types and nested-resource names. Tracked-resource paths must use subscription and resource-group scope. Provider namespaces in paths must use PascalCase and match the service's ARM provider namespace.

Resource type and nested-path requirements apply to GET, PUT, PATCH, and DELETE paths. Provider namespace requirements apply to paths for every HTTP method.

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

Use PascalCase for provider namespaces in paths. The final provider namespace must match the service's ARM provider namespace. If needed, declare it with `@armProviderNamespace("Microsoft.Contoso")`.
