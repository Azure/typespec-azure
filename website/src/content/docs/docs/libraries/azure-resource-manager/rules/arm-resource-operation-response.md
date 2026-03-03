---
title: "arm-resource-operation-response"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response
```

[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema. Operations on a resource such as read, create, update, and list must all return the resource type itself (or a collection of the resource type for list operations).

#### ❌ Incorrect

```tsp
@armResourceOperations
interface FooResources {
  // Returns BarResource instead of FooResource
  @get
  @armResourceRead(FooResource)
  get(...ResourceInstanceParameters<FooResource>): ArmResponse<BarResource> | ErrorResponse;
}
```

#### ✅ Correct

```tsp
@armResourceOperations
interface FooResources {
  @get
  @armResourceRead(FooResource)
  get(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource> | ErrorResponse;
}
```
