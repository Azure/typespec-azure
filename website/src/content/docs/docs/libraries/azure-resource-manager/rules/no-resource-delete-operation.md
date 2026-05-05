---
title: no-resource-delete-operation
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/no-resource-delete-operation
```

Every ARM resource that provides a create operation must also provide a delete operation.

> **See also:** This rule has been superseded by
> [`arm-resource-required-operations`](./arm-resource-required-operations.md),
> which is singleton-aware and additionally enforces presence of `read`,
> `createOrUpdate`, and the appropriate `list` operations. Both rules are
> currently registered for backwards compatibility.

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
