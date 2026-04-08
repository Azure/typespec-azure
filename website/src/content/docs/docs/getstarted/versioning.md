---
title: Versioning
---

Versioning lets you evolve your API without breaking existing clients. This guide covers the basics of declaring versions and adding new resources, operations, and properties in a clear, easy-to-follow way. For more advanced scenarios, see the [full versioning documentation](../howtos/Versioning/01-about-versioning.md).

## Declaring Versions

To support multiple API versions, define them in an enum. After defining your enum, link it to your namespace using the `@versioned` decorator. For each version, specify your dependencies:

**ARM:**

```tsp
/** Contoso API versions */
enum Versions {
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v1,

  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2,
}

@versioned(Versions)
namespace Microsoft.ContosoProviderHub;
```

**Data-plane:**

```tsp
enum Versions {
  v1,
  v2,
}

@versioned(Versions)
@service(#{ title: "Widget Service" })
namespace DemoService;
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

**Add an operation in v2 (ARM):**

```tsp
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  @added(Versions.v2)
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
```

**Add an operation in v2 (Data-plane):**

```tsp
interface Widgets {
  getWidget is Operations.ResourceRead<Widget>;
  @added(Versions.v2)
  createOrReplaceWidget is Operations.ResourceCreateOrReplace<Widget>;
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

**Add a parameter in v2 (ARM):**

```tsp
@armResourceOperations
interface Employees {
  get is ArmResourceRead<
    Employee,
    Parameters = {
      name: string;

      @added(Versions.v2)
      department?: string;
    }
  >;
}
```

**Add a parameter in v2 (Data-plane):**

```tsp
interface Widgets {
  getWidget is Operations.ResourceRead<
    Widget,
    Traits = {
      parameters: {
        @query
        name: string;

        @added(Versions.v2)
        @query
        department?: string;
      };
    }
  >;
}
```

## Adding New Operations

You can add new operations to an interface for a specific version:

**Add a new operation in v2 (ARM):**

```tsp
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;

  @added(Versions.v2)
  move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;
}
```

**Add a new operation in v2 (Data-plane):**

```tsp
interface Widgets {
  getWidget is Operations.ResourceRead<Widget>;

  @added(Versions.v2)
  moveWidget is Operations.ResourceAction<Widget, MoveRequest, MoveResponse>;
}
```

---

For more details and advanced scenarios, see the [full versioning documentation](../howtos/Versioning/01-about-versioning.md).
