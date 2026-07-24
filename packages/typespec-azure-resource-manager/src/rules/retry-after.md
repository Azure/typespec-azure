Check if the `Retry-After` header appears in the response for long-running operations. For long-running operations, the `Retry-After` header indicates how long the client should wait before polling the operation status. This header should be included in 201 or 202 responses.

## Impact

- **Area:** API

Long-running or throttled operations should expose a standard Retry-After header so clients can poll correctly.

## ❌ Incorrect

Custom long-running operation missing `Retry-After` header:

```tsp
@armResourceOperations
interface FooResources {
  @Azure.Core.pollingOperation(FooResources.getOperationStatus)
  @post
  update(): FooResource;

  getOperationStatus(): {
    status: Status;
  };
}
```

## ✅ Correct

Use ARM operation templates which include the `Retry-After` header automatically:

```tsp
@armResourceOperations
interface FooResources {
  start is ArmResourceActionAsync<FooResource, FooRequestBody, FooResponse>;
}
```

Or include `Foundations.RetryAfterHeader` in your custom response:

```tsp
@armResourceOperations
interface FooResources {
  @Azure.Core.pollingOperation(FooResources.getOperationStatus)
  @post
  update(): FooResource & Foundations.RetryAfterHeader;

  getOperationStatus(): {
    status: Status;
  };
}
```

## Suppression

Suppress only when required to match an existing API; otherwise add the standard Retry-After header.
