# How TCGC Handles Namespace for Clients and Types

This document describes how the TypeSpec Client Generator Core (TCGC) resolves and assigns namespaces for clients and types.

## Overview

TCGC has two levels of representation:

1. **`SdkClient`** — the raw client structure built during cache preparation, based on `@service` namespaces, `@client` decorators, and TypeSpec namespace/interface hierarchy.
2. **`SdkClientType`** — the final client type emitted in `SdkPackage`, which carries a `namespace: string` property resolved via `getClientNamespace`.

All SDK types (`SdkModelType`, `SdkEnumType`, `SdkUnionType`, `SdkNullableType`) also carry a `namespace: string` property, resolved by the same `getClientNamespace` function.

The final `SdkPackage` organizes everything into a hierarchical `namespaces: SdkNamespace[]` tree based on these resolved namespace strings.

---

## Namespace Resolution for Clients

### How clients are created

#### No explicit `@client` decorator

When there are no `@client` decorators, TCGC creates one root client per `@service` namespace. Nested namespaces and interfaces under each service namespace become sub-clients in a hierarchy.

```typespec
@service(#{ title: "Pet Store" })
namespace PetStore {
  interface Dogs {
    feed(): void;
  }
  namespace Cats {
    op feed(): void;
  }
}
```

This produces:

- Root client: `PetStoreClient` (backed by namespace `PetStore`)
- Sub-client: `Dogs` (backed by interface `PetStore.Dogs`)
- Sub-client: `Cats` (backed by namespace `PetStore.Cats`)

#### With explicit `@client` decorator

When `@client` is used, each top-level `@client` becomes a root client, and nested `@client` declarations become sub-clients.

```typespec
@client({ name: "DogsClient", service: PetStore })
namespace DogsClient {
  @client
  interface Feed { ... }
}
```

Root clients **must** have a `service` specified (or inherit one from a parent). Sub-clients inherit their parent's service if none is specified.

### How the client's `namespace` property is set

When `SdkClientType` is created (in `clients.ts`), the `namespace` property is set by calling:

```ts
namespace: getClientNamespace(context, clientType);
```

Where `clientType` is the TypeSpec `Namespace` or `Interface` backing the client (obtained via `getActualClientType(client)`).

---

## Namespace Resolution Logic (`getClientNamespace`)

The `getClientNamespace` function resolves the namespace string for any entity (`Namespace`, `Interface`, `Model`, `Enum`, `Union`) using the following priority:

### Priority 1: `@clientNamespace` decorator

If the entity has an `@clientNamespace` decorator applied, its value takes the highest priority.

```typespec
@clientNamespace("MyCompany.Pets")
namespace PetStore { ... }
```

- If a `--namespace` flag is also provided and the override already matches or extends the flag, no replacement occurs.
- If a `--namespace` flag is provided and there is an overlap with a user-defined namespace, the root of the `@clientNamespace` value is replaced with the flag value.
- Otherwise, the `@clientNamespace` value is returned as-is.

### Priority 2: `--namespace` flag (emitter option)

If the `--namespace` flag is set via emitter options (stored as `context.namespaceFlag`), and there is no `@clientNamespace` decorator, the flag value is used as the namespace for **all** entities.

This effectively collapses all types into a single flat namespace.

### Priority 3: Original TypeSpec namespace

If neither `@clientNamespace` nor `--namespace` is set, TCGC returns the full namespace path from the TypeSpec definition:

- For **Namespace** entities: walks up the namespace chain, joining segments with `.`.
- For **Interface/Model/Enum/Union** entities: returns the full name of the containing namespace.

For example, a model defined in `PetStore.Models` would get namespace `"PetStore.Models"`.

### Namespace override propagation

The helper function `getNamespaceFullNameWithOverride` walks up the namespace chain and checks each ancestor for a `@clientNamespace` decorator. If one is found, it is used as the root and remaining segments are appended. The `--namespace` flag replacement is also applied when applicable.

---

## Namespace Resolution for Types

All named SDK types get their namespace resolved using the same `getClientNamespace` function:

| Type              | Where namespace is set                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `SdkModelType`    | `getSdkModelWithDiagnostics` — calls `getClientNamespace(context, type)` on the TypeSpec `Model` |
| `SdkEnumType`     | `getSdkEnum` — calls `getClientNamespace(context, type)` on the TypeSpec `Enum`                  |
| `SdkUnionType`    | `getSdkUnion` — calls `getClientNamespace(context, type)` on the TypeSpec `Union`                |
| `SdkNullableType` | Inherits namespace from the underlying union type it wraps                                       |

This means models, enums, and unions get their namespace from the TypeSpec namespace where they are **defined**, not where they are **used**.

---

## Namespace Organization in `SdkPackage`

After all clients and types are created, the `organizeNamespaces` function in `package.ts` builds the hierarchical `SdkNamespace` tree:

1. It iterates over all clients (including children recursively) and places each into the `SdkNamespace` node matching its `namespace` string.
2. It iterates over all models, enums, and unions and places each into the corresponding `SdkNamespace`.
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

---

## Summary of Namespace Resolution Order

```
@clientNamespace decorator on the entity
    ↓ (if not set)
--namespace emitter flag
    ↓ (if not set)
Original TypeSpec namespace (full dotted path)
```

This applies uniformly to **both clients and types**. The only difference is that clients resolve the namespace from their backing `Namespace`/`Interface` type, while types resolve it from their own defining `Namespace`.
