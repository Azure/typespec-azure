---
title: Versioning
---

Versioning lets you evolve your API without breaking existing clients. This guide covers the basics of declaring versions and adding new resources, operations, and properties in a clear, easy-to-follow way. For more advanced scenarios, see the [full versioning documentation](../howtos/ARM/versioning.md).

## Declaring Versions

To support multiple API versions, define them in an enum. After defining your enum, link it to your namespace using the `@versioned` decorator. For each version, specify your dependencies:

```tsp
/** Contoso API versions */
enum Versions {
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v1,

  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2,
}

@versioned(Versions)
namespace Microsoft.ContosoProviderHub;
```

## Adding a Resource or Operation

To introduce a new model or operation in a specific version (and all later versions), use the `@added` decorator:

**Add a model in v2:**

```tsp
@added(Versions.v2)
model Employee {
  name: string;
}
```

**Add an operation in v2:**

```tsp
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  @added(Versions.v2)
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
```

## Adding a Property or Parameter

You can also add new properties or parameters to models and operations in a specific version:

**Add a property in v2:**

```tsp
model Employee {
  name: string;

  @added(Versions.v2)
  city?: string;
}
```

**Add a parameter in v2:**

```tsp
@armResourceOperations
interface Employees {
  get(
    name: string,

    @added(Versions.v2)
    department?: string,
  ): Employee | ErrorResponse;
}
```

## Adding New Operations

You can add new operations to an interface for a specific version:

**Add a new operation in v2:**

```tsp
interface Employees {
  get is ArmResourceRead<Employee>;
  @added(Versions.v2)
  promote is ArmResourceAction<Employee, PromotionResult>;
}
```

---

For more details and advanced scenarios, see the [full versioning documentation](../howtos/ARM/versioning.md).
