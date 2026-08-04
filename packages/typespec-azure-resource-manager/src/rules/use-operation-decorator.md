---
title: "use-operation-decorator"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/use-operation-decorator
```

Validate that ARM Resource operations use the correct decorator for the HTTP verb.

:::note
This rule only applies to custom operations. Operations using standard ARM resource templates (e.g. `ArmResourceRead`, `ArmResourceCreateOrReplaceAsync`) automatically satisfy this rule unless the http verb is overridden in the spec with additional http verb decorators.
:::

| HTTP Verb | Required decorator(s)                                  |
| --------- | ------------------------------------------------------ |
| PUT       | `@armResourceCreateOrUpdate`                           |
| GET       | `@armResourceRead` or `@armResourceList`               |
| PATCH     | `@armResourceUpdate`                                   |
| DELETE    | `@armResourceDelete`                                   |
| POST      | `@armResourceAction` or `@armResourceCollectionAction` |

## Impact

- **Area:** API, SDK, Emitters

Missing or mismatched decorators prevent resource operations from being associated with the correct resource, which can break SDK generation and resource-aware tooling.

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
  @action("myAction")
  @post
  myAction(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource>;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use the correct ARM decorator for the operation's HTTP verb.
