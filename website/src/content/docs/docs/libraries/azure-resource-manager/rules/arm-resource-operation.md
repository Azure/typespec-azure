---
title: "arm-resource-operation"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-operation
```

Validate ARM Resource operations. All resource operations must be defined inside an interface, include an `api-version` parameter, and use the correct decorator for the HTTP verb.

#### ❌ Incorrect

Operations must be inside an interface:

```tsp
// Operation defined outside of an interface
@armResourceRead(FooResource)
@get
op getFoos(...ApiVersionParameter): FooResource;
```

Operations must use the correct ARM resource decorator for the HTTP verb:

```tsp
@armResourceOperations
interface FooResources {
  // Missing @armResourceCreateOrUpdate decorator
  @put createOrUpdate(
    ...ResourceInstanceParameters<FooResource>,
    @bodyRoot resource: FooResource,
  ): ArmResponse<FooResource>;
}
```

#### ✅ Correct

```tsp
@armResourceOperations
interface FooResources {
  get is ArmResourceRead<FooResource>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<FooResource>;
}
```
