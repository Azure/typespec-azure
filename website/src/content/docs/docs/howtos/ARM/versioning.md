---
title: Versioning
---

This document explains how to manage versioning in TypeSpec projects, including how to add, remove, or modify resources, operations, and properties across API versions.

## Introduction

Versioning allows you to evolve your API without breaking existing clients. By using versioning decorators, you can specify when resources, operations, or properties are added, removed, or changed.

## Declaring Versions

Define your API versions in an enum. For each version, specify dependencies and common types as needed.

```tsp
/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v1,

  /** 2022-11-01-preview version */
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2,
}
```

After defining your enum, link it to your namespace using the `@versioned` decorator:

```tsp
@versioned(Versions)
namespace Microsoft.ContosoProviderHub;
```

> **Note:** Add dependencies and common types for each version. After defining a new version, the emitter will produce outputs for all versions. You can then adapt your TypeSpec code for the latest version.

## Simple Scenarios

These examples show how to add models, operations, properties, and parameters in specific versions using TypeSpec versioning decorators.

---

### Add a model in v2

```tsp
@added(Versions.v2)
model Employee {
  name: string;
}
```

### Add an operation in v2

```tsp
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  @added(Versions.v2)
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
```

### Add a property in v2

```tsp
model Employee {
  name: string;

  @added(Versions.v2)
  city?: string;
}
```

### Add a parameter to an operation in v2

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

### Add a new operation in v2

```tsp
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;

  @added(Versions.v2)
  move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;
}
```

## Complex Scenarios

These scenarios demonstrate more advanced versioning patterns, such as changing decorators, adding and making parameters optional, and converting operations from synchronous to asynchronous.

---

### Adding Decoration to an Existing Type

This scenario demonstrates how to change a decorator’s usage across versions.

Suppose you have a model property with a decorator:

```tsp
model Employee {
  @visibility(Lifecycle.Read)
  experience: string;
}
```

In the next version (v2), the visibility changes so that the property can be read or created. To achieve this, you can use a combination of `@removed`, `@added`, and `@renamedFrom` decorators:

```tsp
model Employee {
  @removed(Versions.v2)
  @visibility(Lifecycle.Read)
  @renamedFrom(Versions.v2, "experience")
  oldExperience: string;

  @added(Versions.v2)
  @visibility(Lifecycle.Read, Lifecycle.Create)
  experience: string;
}
```

### Adding a Parameter to an Operation and Making Another Parameter Optional

This scenario shows how to add a parameter and make another optional in an operation.

Suppose you start with the following operation in v1:

```tsp
@armResourceOperations
interface Employees {
  listBySubscription is ArmListBySubscription<
    Employee,
    Parameters = {
      @header
      location: string;
    }
  >;
}
```

In version `v2`, you want to:

- Make the `location` header parameter optional.
- Add a new optional query parameter `orderBy`.

You can achieve this using the `@madeOptional` and `@added` decorators:

```tsp
@armResourceOperations
interface Employees {
  listBySubscription is ArmListBySubscription<
    Employee,
    Parameters = {
      @madeOptional(Versions.v2)
      @header
      location?: string;

      @added(Versions.v2)
      @query("order-by")
      orderBy?: string;
    }
  >;
}
```

**Explanation:**

- `@madeOptional(Versions.v2)` makes `location` optional starting in v2.
- `@added(Versions.v2)` adds the `orderBy` query parameter in v2 and later.

### Converting an Operation from Synchronous to Asynchronous

This scenario illustrates converting a synchronous operation to an asynchronous one across versions.

Suppose you start with the following synchronous operation in `v1`:

```tsp
@armResourceOperations
interface Employees {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Employee>;
}
```

In version `v2`, you update this operation to be asynchronous as follows:

```tsp
@armResourceOperations
interface Employees {
  @removed(Versions.v2)
  @renamedFrom(Versions.v2, "createOrUpdate")
  @sharedRoute
  createOrUpdateV1 is ArmResourceCreateOrReplaceSync<Employee>;

  @added(Versions.v2)
  @sharedRoute
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
```

**Explanation:**

- `@removed(Versions.v2)` removes the original synchronous operation in v2 and later.
- `@renamedFrom(Versions.v2, "createOrUpdate")` keeps the original name for v1.
- `@added(Versions.v2)` adds the new asynchronous operation in v2 and later.
- `@sharedRoute` ensures both operations can use the same route.

## Versioning Decorators

### @added

You can add new models, properties, or operations in a specific version and all subsequent versions using the `@added` decorator.

- The `version` argument is the version where the element is introduced.
- The element will be present in that version and all later versions.

**Example: Adding a model and property across versions**

For example, suppose you want to add a new model and then add a property to it in a later version:

```tsp
// v1: No Employee model exists

// v2: Add Employee model
@added(Versions.v2)
model Employee {
  name?: string;
}

// v3: Add 'city' property to Employee
model Employee {
  name: string;

  @added(Versions.v3)
  city?: string;
}
```

**Example: Adding an operation in a later version**

```tsp
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  // v3: Add createOrUpdate operation
  @added(Versions.v3)
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
```

### @removed

To remove models, properties, or operations starting from a specific version, use the `@removed` decorator.

- The `version` argument is the version where the element is removed.
- The element will not be present in that version or any later versions.

**Example: Removing a property and a model across versions**

For example:

```tsp
// v1: Employee model with 'city' property
model Employee {
  name: string;
  city?: string;
}

// v2: Remove 'city' property
model Employee {
  name: string;

  @removed(Versions.v2)
  city?: string;
}

// v3: Remove Employee model entirely
@removed(Versions.v3)
model Employee {
  name: string;
}
```

**Example: Removing an operation**

```tsp
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  @removed(Versions.v3)
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
```

### @madeRequired and @madeOptional

Use these decorators to change whether a property is required or optional in a specific version.

- Use `@madeOptional(Versions.version)` to make a property optional starting in that version.
- Use `@madeRequired(Versions.version)` to make a property required starting in that version.

**Example: Changing a property from required to optional, then back to required**

For example:

```tsp
// v1: movingStatus is required
model MoveResponse {
  movingStatus: string;
}

// v2: movingStatus becomes optional
model MoveResponse {
  @madeOptional(Versions.v2)
  movingStatus?: string;
}
```

### @renamedFrom

Use `@renamedFrom` to rename models, properties, operations, enums, etc., in a specific version.

- The `version` argument is the version where the name changed.
- The `oldName` argument is the previous name.

**Example: Renaming a property and a model across versions**

For example:

```tsp
// v1: Model and property have original names
model WorkerProperties {
  state?: string;
}

// v2: Rename property 'state' to 'city'
model WorkerProperties {
  @renamedFrom(Versions.v2, "state")
  city?: string;
}

// v3: Rename model 'WorkerProperties' to 'EmployeeProperties'
@renamedFrom(Versions.v3, "WorkerProperties")
model EmployeeProperties {
  @renamedFrom(Versions.v2, "state")
  city?: string;
}
```

## FAQ

### How do I version a pattern?

I have this model and I would like to change the pattern in v2

```tsp
model EmployeeProperties {
  @pattern("^[a-z]+$")
  state: string;
}
```

:::caution

Updating a pattern could be a breaking change:

- A **more restrictive pattern** for input data would break existing clients that send previously valid data
- A **less restrictive pattern** for output data could break client assumptions and validation logic

:::

The key question is: **Does the pattern change apply to all API versions, or only to the new version?**

#### 1. Pattern changes for all versions

If the pattern change reflects how your service actually behaves across all versions, update the pattern directly. The specification should accurately reflect the current state of your service.

```diff lang=tsp
model EmployeeProperties {
-  @pattern("^[a-z]+$")
+  @pattern("^[a-zA-Z]+$")
   state: string;
}
```

:::note
This will update all openapi specs versions with the new pattern which is the desired behavior.
:::

#### 2. Different patterns per version (**Very unlikely**)

If older API versions truly enforce a different pattern than newer versions, you need to model this explicitly using versioning decorators:

```tsp
model EmployeeProperties {
  @removed(Versions.v2)
  @pattern("^[a-z]+$")
  @renamedFrom(Versions.v2, "state")
  oldState: string;

  @added(Versions.v2)
  @pattern("^[a-zA-Z]+$")
  state: string;
}
```
