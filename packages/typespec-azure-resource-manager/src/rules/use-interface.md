---
title: "use-interface"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/use-interface
```

Validate that all ARM Resource operations are defined inside an interface declaration.

See also:

- [`use-operation-decorator`](./use-operation-decorator.md) — validates that operations use the correct decorator for the HTTP verb.
- [`use-api-version`](./use-api-version.md) — validates that operations include an `api-version` parameter.

## Impact

- **Area:** API, SDK, Emitters

Defining resource operations outside interfaces can break ARM resource-operation modeling and downstream tooling assumptions, including resource-based SDK generation and linting.

## ❌ Incorrect

Operations must be inside an interface:

```tsp
// Operation defined outside of an interface
@armResourceRead(FooResource)
@get
op getFoos(...ApiVersionParameter): FooResource;
```

## ✅ Correct

```tsp
@armResourceOperations
interface FooResources {
  get is ArmResourceRead<FooResource>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<FooResource>;
}
```

## Suppression

Requires C# SDK sign-off and careful review of any other violations. Prefer standard ARM resource operation templates and keep resource operations within `@armResourceOperations` interfaces.
