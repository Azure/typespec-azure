---
title: put-operation-response-codes
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/put-operation-response-codes
```

Put operations should use the `ArmResourceCreateOrUpdateAsync`, `ArmResourceCreateOrReplaceAsync` or `ArmResourceCreateOrReplaceSync` template. They must have 200, 201, default and no other responses.

#### ❌ Incorrect

```tsp
@armResourceOperations
interface Employees {
  @armResourceCreateOrUpdate(Employee)
  createOrUpdate(...ApiVersionParameter): {
    @statusCode _: 200;
    result: boolean;
  };
}
```

#### ✅ Correct

```tsp
@armResourceOperations
interface Employees {
  createOrUpdate is ArmResourceCreateOrUpdateAsync<Employee>;
}
```
