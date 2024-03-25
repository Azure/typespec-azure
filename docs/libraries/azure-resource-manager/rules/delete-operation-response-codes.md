---
title: delete-operation-response-codes
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/delete-operation-response-codes
```

## Synchronous

Synchronous delete operations should use the `ArmResourceDeleteSync` template. They must have 200, 204, default and no other responses.

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
  delete is ArmResourceDeleteSync<Employee>;
}
```

## Asynchronous

Long-running (LRO) delete operations should use the `ArmResourceDeleteWithoutOkAsync` template. They must have 202, 204, default, and no other responses.

#### ❌ Incorrect

```tsp
@armResourceOperations
interface Employees {
  @armResourceDelete(Employee)
  update is ArmCustomPatchAsync<Employee, EmployeeUpdate, LroHeaders = {}>;
}
```

#### ✅ Correct

```tsp
@armResourceOperations
interface Employees {
  @armResourceDelete(Employee)
  update is ArmCustomPatchAsync<Employee, EmployeeUpdate>;
}
```
