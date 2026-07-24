```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/no-resource-delete-operation
```

Every ARM resource that provides a create operation must also provide a delete operation.

## Impact

- **Area:** API

A tracked resource without a delete operation violates the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [AllTrackedResourcesMustHaveDelete](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

## ❌ Incorrect

```tsp
@armResourceOperations
interface EmployeeOperations {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
```

## ❌ Incorrect

```tsp
@armResourceOperations
interface EmployeeOperations {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  delete is ArmResourceDeleteWithoutOkAsync<Store>; // delete operation for a different resource
}
```

## ✅ Correct

```tsp
@armResourceOperations
interface EmployeeOperations {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  delete is ArmResourceDeleteWithoutOkAsync<Employee>;
}
```

## Suppression

Suppress per the RPC guidelines; otherwise add a standard delete operation for the resource.
