---
title: "arm-resource-operation"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-operation
```

Validate that all ARM Resource operations are defined inside an interface declaration.

See also:

- [`arm-resource-operation-missing-decorator`](./arm-resource-operation-missing-decorator.md) — validates that operations use the correct decorator for the HTTP verb.
- [`arm-resource-operation-missing-api-version`](./arm-resource-operation-missing-api-version.md) — validates that operations include an `api-version` parameter.

#### ❌ Incorrect

Operations must be inside an interface:

```tsp
// Operation defined outside of an interface
@armResourceRead(FooResource)
@get
op getFoos(...ApiVersionParameter): FooResource;
```

#### ✅ Correct

```tsp
@armResourceOperations
interface FooResources {
  get is ArmResourceRead<FooResource>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<FooResource>;
}
```
