---
title: no-resource-delete-operation
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/no-resource-delete-operation
```

Every ARM resource that provides a create operation must also provide a delete operation.

#### ❌ Incorrect

```tsp
@armResourceOperations
interface EmployeeOperations {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
```

#### ❌ Incorrect

```tsp
@armResourceOperations
interface EmployeeOperations {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  delete is ArmResourceDeleteWithoutOkAsync<Store>; // delete operation for a different resource
}
```

#### ✅ Correct

```tsp
@armResourceOperations
interface EmployeeOperations {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  delete is ArmResourceDeleteWithoutOkAsync<Employee>;
}
```
