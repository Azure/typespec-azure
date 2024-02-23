---
title: delete-operation-response-codes
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/delete-operation-response-codes
```

## Synchronous

Synchronous delete operations must have 200, 204, and default responses. They must not have any other responses.

#### ❌ Incorrect

```tsp
@armResourceOperations
interface Employees {
  @armResourceDelete(Employee)
  delete(...ApiVersionParameter): {
    @statusCode _: 200;
    result: boolean;
  };
}
```

#### ✅ Correct

```tsp
@armResourceOperations
interface Employees {
  @armResourceDelete(Employee)
  delete(...ApiVersionParameter): {
    @statusCode _: 200;
    result: boolean;
  } | {
    @statusCode _: 204;
    result: boolean;
  } | ErrorResponse;
}
```

## Asynchronous

Long-running (LRO) delete operations must have 202, 204, and default responses. They must not have any other responses.

#### ❌ Incorrect

```tsp
@armResourceOperations
interface Employees {
  delete is ArmResourceDeleteAsync<Employee>;
}
```

#### ✅ Correct

```tsp
@armResourceOperations
interface Employees {
  delete is ArmResourceDeleteWithoutOkAsync<Employee>;
}
```
