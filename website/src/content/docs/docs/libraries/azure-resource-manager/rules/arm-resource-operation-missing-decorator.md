---
title: "arm-resource-operation-missing-decorator"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-operation-missing-decorator
```

Validate that ARM Resource operations use the correct decorator for the HTTP verb.

| HTTP Verb | Required decorator(s)                                   |
| --------- | ------------------------------------------------------- |
| PUT       | `@armResourceCreateOrUpdate`                            |
| GET       | `@armResourceRead` or `@armResourceList`                |
| PATCH     | `@armResourceUpdate`                                    |
| DELETE    | `@armResourceDelete`                                    |
| POST      | `@armResourceAction` or `@armResourceCollectionAction`  |

#### ❌ Incorrect

Operations must use the correct ARM resource decorator for the HTTP verb:

```tsp
@armResourceOperations
interface FooResources {
  // Missing @armResourceCreateOrUpdate decorator
  @put
  createOrUpdate(
    ...ResourceInstanceParameters<FooResource>,
    @bodyRoot resource: FooResource,
  ): ArmResponse<FooResource>;

  // Missing @armResourceRead or @armResourceList decorator
  @get
  get(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource>;
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
