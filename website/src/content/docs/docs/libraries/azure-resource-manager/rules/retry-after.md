---
title: "retry-after"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/retry-after
```

Check if the `Retry-After` header appears in the response for long-running operations. For long-running operations, the `Retry-After` header indicates how long the client should wait before polling the operation status. This header should be included in 201 or 202 responses.

#### ❌ Incorrect

```tsp
@armResourceOperations
interface Employees {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
```

#### ✅ Correct

```tsp
@armResourceOperations
interface Employees {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<
    Employee,
    Response = ArmResponse<Employee> & RetryAfterHeader
  >;
}
```
