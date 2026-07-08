---
title: "arm-resource-operation-missing-decorator"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-operation-missing-decorator
```

Validate that ARM Resource operations use the correct decorator for the HTTP verb.

| HTTP Verb | Required decorator(s)                                  |
| --------- | ------------------------------------------------------ |
| PUT       | `@armResourceCreateOrUpdate`                           |
| GET       | `@armResourceRead` or `@armResourceList`               |
| PATCH     | `@armResourceUpdate`                                   |
| DELETE    | `@armResourceDelete`                                   |
| POST      | `@armResourceAction` or `@armResourceCollectionAction` |

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

Using standard ARM resource operation templates (recommended):

```tsp
@armResourceOperations
interface FooResources {
  get is ArmResourceRead<FooResource>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<FooResource>;
  update is ArmResourcePatchAsync<FooResource, FooResourceProperties>;
  delete is ArmResourceDeleteWithoutOkAsync<FooResource>;
  list is ArmResourceListByParent<FooResource>;
}
```

Or adding the correct decorator for each HTTP verb explicitly:

```tsp
@armResourceOperations
interface FooResources {
  @armResourceRead(FooResource)
  @get
  get(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource>;

  @armResourceCreateOrUpdate(FooResource)
  @put
  createOrUpdate(
    ...ResourceInstanceParameters<FooResource>,
    @bodyRoot resource: FooResource,
  ): ArmResponse<FooResource>;

  @armResourceDelete(FooResource)
  @delete
  delete(...ResourceInstanceParameters<FooResource>): void;

  @armResourceList(FooResource)
  @get
  list(...SubscriptionIdParameter, ...ResourceGroupParameter): ArmResponse<FooResourceListResult>;

  @armResourceAction(FooResource)
  @action
  @post
  myAction(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource>;
}
```
