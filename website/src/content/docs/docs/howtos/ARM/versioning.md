---
title: Versioning
---

This document explains how to manage versioning in TypeSpec projects, including how to add, remove, or modify resources, operations, and properties across API versions.

## Table of Contents

- [Introduction](#introduction)
- [Declaring Versions](#declaring-versions)
- [Versioning Decorators](#versioning-decorators)
  - [@added](#added)
  - [@removed](#removed)
  - [@madeRequired and @madeOptional](#maderequired-and-madeoptional)
  - [@typeChangedFrom](#typechangedfrom)
  - [@renamedFrom](#renamedfrom)
  - [@returnTypeChangedFrom](#returntypechangedfrom)
- [Complex Scenarios](#complex-scenarios)

---

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

## Versioning Decorators

### @added

Use `@added(Versions.version)` to add resources, operations, or properties in a specific version and all subsequent versions.

- The `version` argument is the version where the element was introduced.
- The element will be present in that version and all later versions.

**Example: Adding a model and property across versions**

Suppose you want to add a new model and then add a property to it in a later version:

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

Use `@removed(Versions.version)` to remove models, properties, or operations starting from a specific version.

- The `version` argument is the version where the element is removed.
- The element will not be present in that version or any later versions.

**Example: Removing a property and a model across versions**

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

Use these decorators to change a property’s required/optional status in a specific version.

- Use `@madeOptional(Versions.version)` to make a property optional starting in that version.
- Use `@madeRequired(Versions.version)` to make a property required starting in that version.

**Example: Changing a property from required to optional, then back to required**

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

Use `@renamedFrom(version, oldName)` to rename models, properties, operations, enums, etc.

- The `version` argument is the version where the name changed.
- The `oldName` argument is the previous name.

**Example: Renaming a property and a model across versions**

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

### @returnTypeChangedFrom

Use this decorator to change the return type of an operation in a specific version.

```tsp
@armResourceOperations
interface Employees {
  @removed(Versions.v2)
  @returnTypeChangedFrom(Versions.v2, Worker)
  get is ArmResourceRead<Employee>;
}

model Employee {
  name: string;
}

model Worker {
  name: string;
}
```

## Complex Scenarios

### Adding decoration to an existing type

Decorators themselves do not directly support versioning, but you can use other approaches to achieve versioned changes in decorator usage.

Suppose you have a model property with a decorator:

```tsp
model Employee {
  @visibility(Lifecycle.Read)
  experience: string;
}
```

In the next version (v2), the visibility changes so that the property can be read or created. To achieve this, you can use a combination of @removed, @added, and @renamedFrom decorators:

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

Suppose you start with the following operation in v1:

```tsp
@armResourceOperations
interface Employees {
  get(name: string, identifier: int32): Employee | ErrorResponse;
}
```

In version `v2`, you want to:

- Make the `identifier` parameter optional.
- Add a new optional parameter `field`.

You can achieve this using the `@madeOptional` and `@added` decorators:

```tsp
@armResourceOperations
interface Employees {
  get(
    name: string,

    @madeOptional(Versions.v2)
    identifier?: int32,

    @added(Versions.v2)
    field?: string,
  ): Employee | ErrorResponse;
}
```

**Explanation:**

- `@madeOptional(Versions.v2)` makes `identifier` optional starting in v2.
- `@added(Versions.v2)` adds the `field` parameter in v2 and later.
