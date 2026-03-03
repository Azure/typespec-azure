---
title: "retry-after"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/retry-after
```

Check if the `Retry-After` header appears in the response for long-running operations. For long-running operations, the `Retry-After` header indicates how long the client should wait before polling the operation status. This header should be included in 201 or 202 responses.

#### ❌ Incorrect

Long-running operation without `Retry-After` header:

```tsp
@armResourceOperations
interface FooResources {
  @Azure.Core.pollingOperation(FooResources.getOperationStatus)
  @post
  op update(): FooResource;

  op getOperationStatus(): { status: Status };
}
```

#### ✅ Correct

Add `Retry-After` header to the response:

```tsp
model UpdateFooResponse {
  @header("Retry-After") retryAfter: utcDateTime;
  ...FooResource;
}

@armResourceOperations
interface FooResources {
  @armResourceUpdate(FooResource)
  @patch(#{implicitOptionality: true})
  update(): UpdateFooResponse;
}
```
