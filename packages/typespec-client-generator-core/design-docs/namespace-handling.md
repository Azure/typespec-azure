# How TCGC Handles Namespace for Clients and Types

This document describes how the TypeSpec Client Generator Core (TCGC) resolves and assigns namespaces for clients and types.

## Overview

Every client and named type (model, enum, union, nullable) in the final `SdkPackage` carries a `namespace` string property. This namespace determines where the client or type is placed in the hierarchical `SdkNamespace` tree within the package.

All clients and types resolve their namespace using the same underlying logic.

---

## Namespace Resolution Logic

TCGC resolves the namespace string for any entity (namespace, interface, model, enum, union) using the following priority:

### Priority 1: `@clientNamespace` decorator

If the entity (or one of its ancestor namespaces) has a `@clientNamespace` decorator applied, its value takes the highest priority.

```typespec
@clientNamespace("MyCompany.Pets")
namespace PetStore { ... }
```

When resolving a namespace, TCGC walks up the namespace chain and checks each ancestor for a `@clientNamespace` decorator. If one is found, it is used as the root and remaining child segments are appended.

For example, given:

```typespec
@clientNamespace("MyCompany.Pets")
namespace PetStore {
  namespace Models { ... }
}
```

- `PetStore` resolves to `"MyCompany.Pets"`
- `PetStore.Models` resolves to `"MyCompany.Pets.Models"`

### Priority 2: `--namespace` flag (emitter option)

If the `--namespace` flag is set via emitter options, and there is no `@clientNamespace` decorator, the flag value is used as the namespace for **all** entities.

This effectively collapses all types into a single flat namespace.

### Priority 3: Original TypeSpec namespace

If neither `@clientNamespace` nor `--namespace` is set, TCGC returns the full namespace path from the TypeSpec definition:

- For **Namespace** entities: walks up the namespace chain, joining segments with `.`.
- For **Interface/Model/Enum/Union** entities: returns the full name of the containing namespace.

For example, a model defined in `PetStore.Models` would get namespace `"PetStore.Models"`.

---

## Namespace Resolution for Types

All named SDK types (models, enums, unions) resolve their namespace using the same logic described above. The namespace is determined by the TypeSpec namespace where the type is **defined**, not where it is **used**.

For nullable types, the namespace is inherited from the underlying type being wrapped.

---

## Namespace Organization in `SdkPackage`

After all clients and types are created, TCGC builds the hierarchical `SdkNamespace` tree in the `SdkPackage`:

1. It iterates over all clients (including children recursively) and places each into the namespace node matching its resolved namespace string.
2. It iterates over all models, enums, and unions and places each into the corresponding namespace node.
3. Namespace nodes are created on-demand by splitting the namespace string on `.` and walking/creating the hierarchy.

### Example

Given:

- Client `PetStoreClient` with `namespace: "PetStore"`
- Model `Dog` with `namespace: "PetStore.Models"`
- Enum `Color` with `namespace: "PetStore"`

The resulting `SdkPackage.namespaces` would look like:

```
SdkPackage
└── namespaces:
    └── PetStore (clients: [PetStoreClient], enums: [Color])
        └── Models (models: [Dog])
```

## Mapping to Language SDK Package Structures

Each language maps the TCGC namespace hierarchy to its own packaging and module conventions. The following examples show how the same TCGC namespace tree translates to each language's SDK structure.

Example 1: Single root namespace with nested namespaces

```typespec
@service(#{ title: "Pet Store" })
namespace Azure.PetStore {
  model Dog { ... }

  namespace Models {
    model Cat { ... }
  }
}
```

TCGC produces:

- Client `PetStoreClient` → namespace `"Azure.PetStore"`
- Model `Dog` → namespace `"Azure.PetStore"`
- Model `Cat` → namespace `"Azure.PetStore.Models"`

### Python

Python maps each namespace segment to a Python package (directory with `__init__.py`). Models within a namespace become classes in that package's module files.

```
azure-petstore/
└── azure/
    └── petstore/
        ├── __init__.py
        ├── _client.py              # PetStoreClient
        ├── models.py               # Dog
        └── models/
            ├── __init__.py
            └── _models.py          # Cat
```

### .NET (C#)

C# maps namespaces directly — each TCGC namespace becomes a C# namespace. Types are organized into files per namespace.

```
Azure.PetStore/
├── PetStoreClient.cs               # namespace Azure.PetStore
├── Dog.cs                          # namespace Azure.PetStore
└── Models/
    └── Cat.cs                      # namespace Azure.PetStore.Models
```

- The dotted namespace string maps 1:1 to C# `namespace` declarations.
- Sub-namespaces typically become sub-folders in the project.

### Java

Java maps each namespace segment to a Java package. Types within a namespace become classes in that package.

```
com/azure/petstore/
├── PetStoreClient.java             # package com.azure.petstore
├── Dog.java                        # package com.azure.petstore
└── models/
    └── Cat.java                    # package com.azure.petstore.models
```

- Dotted namespace segments become nested directory/package levels.
- Java package names are typically lowercased.

### JavaScript / TypeScript

TypeScript maps namespaces to module structure. Types within a namespace are exported from the corresponding module path.

```
azure-petstore/
├── src/
│   ├── index.ts                    # re-exports
│   ├── petStoreClient.ts           # PetStoreClient
│   ├── models.ts                   # Dog
│   └── models/
│       └── index.ts                # Cat
```

- Sub-namespaces may become sub-directories or separate export paths.
- Flat namespace structures are common; deeper nesting depends on the emitter configuration.

### Go

Go maps each namespace to a Go package. Since Go packages are directory-based, each namespace segment becomes a directory.

```
petstore/
├── client.go                       # PetStoreClient, Dog
└── models/
    └── models.go                   # Cat
```

- Go has a flat package model — all types in the same namespace share a single package directory.
- Sub-namespaces become separate packages in sub-directories.

Example 2: Two root namespaces at the same level but only one has a client

Given this TypeSpec where one namespace is a service (with a client) and the other is a shared namespace containing only types:

```typespec
@service(#{ title: "Pet Store" })
namespace PetStore {
  model Dog { ... }
}

namespace Shared {
  model CommonError { ... }
}
```

TCGC produces:

- Client `PetStoreClient` → namespace `"PetStore"`
- Model `Dog` → namespace `"PetStore"`
- Model `CommonError` → namespace `"Shared"` (no client — this namespace only holds types)

The resulting `SdkPackage.namespaces` would look like:

```
SdkPackage
└── namespaces:
    ├── PetStore (clients: [PetStoreClient], models: [Dog])
    └── Shared (models: [CommonError])
```

The `Shared` namespace has no client — it only exists to organize types that are referenced across services.

#### Python

```
azure-petstore/
└── azure/
    └── petstore/
        ├── __init__.py
        ├── _client.py              # PetStoreClient
        ├── _models.py              # Dog
        └── shared/
            ├── __init__.py
            └── _models.py          # CommonError
```

#### .NET (C#)

```
Azure.PetStore/
├── PetStoreClient.cs               # namespace Azure.PetStore
├── Dog.cs                          # namespace Azure.PetStore
└── Shared/
    └── CommonError.cs              # namespace Azure.PetStore.Shared
```

#### Java

```
com/azure/petstore/
├── PetStoreClient.java             # package com.azure.petstore
├── Dog.java                        # package com.azure.petstore
└── shared/
    └── CommonError.java            # package com.azure.petstore.shared
```

#### JavaScript / TypeScript

```
azure-petstore/
└── src/
    ├── index.ts
    ├── petStoreClient.ts           # PetStoreClient
    ├── models.ts                   # Dog
    └── shared/
        └── index.ts                # CommonError
```

#### Go

```
petstore/
├── client.go                       # PetStoreClient, Dog
└── shared/
    └── models.go                   # CommonError
```

The client-less namespace is folded into the client package as a sub-namespace in most languages, since it doesn't warrant a standalone package on its own.

Example 3: Two root namespaces at the same level and each have clients

Given this TypeSpec with two sibling service namespaces:

```typespec
@service(#{ title: "Pet Store" })
namespace PetStore {
  model Dog { ... }
}

@service(#{ title: "Toy Store" })
namespace ToyStore {
  model Car { ... }
}
```

Each language handles two root namespaces differently:

#### Python

Two sibling root namespaces typically result in two separate packages:

```
azure-petstore/
└── azure/
    └── petstore/
        ├── __init__.py
        ├── _client.py              # PetStoreClient
        └── _models.py              # Dog

azure-toystore/
└── azure/
    └── toystore/
        ├── __init__.py
        ├── _client.py              # ToyStoreClient
        └── _models.py              # Car
```

#### .NET (C#)

Two root namespaces become two separate C# namespaces, typically in separate projects:

```
Azure.PetStore/
├── PetStoreClient.cs               # namespace Azure.PetStore
└── Dog.cs                          # namespace Azure.PetStore

Azure.ToyStore/
├── ToyStoreClient.cs               # namespace Azure.ToyStore
└── Car.cs                          # namespace Azure.ToyStore
```

#### Java

Two root namespaces become two separate Java packages:

```
com/azure/petstore/
├── PetStoreClient.java             # package com.azure.petstore
└── Dog.java                        # package com.azure.petstore

com/azure/toystore/
├── ToyStoreClient.java             # package com.azure.toystore
└── Car.java                        # package com.azure.toystore
```

#### JavaScript / TypeScript

Two root namespaces typically result in two separate npm packages:

```
azure-petstore/
└── src/
    ├── index.ts
    ├── petStoreClient.ts           # PetStoreClient
    └── models.ts                   # Dog

azure-toystore/
└── src/
    ├── index.ts
    ├── toyStoreClient.ts           # ToyStoreClient
    └── models.ts                   # Car
```

#### Go

Two root namespaces become two separate Go packages:

```
petstore/
└── client.go                       # PetStoreClient, Dog

toystore/
└── client.go                       # ToyStoreClient, Car
```

---
