```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/lro-location-header
```

Long-running (LRO) operations with 202 responses must have a "Location" response header.

## Impact

- **Area:** API

A long-running operation without the standard Location header violates the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [LroLocationHeader](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

## ❌ Incorrect

```tsp
@armResourceOperations
interface Employees {
  delete is ArmResourceDeleteWithoutOkAsync<Employee, EmployeeProperties, LroHeaders = {}>;
}
```

## ✅ Correct

```tsp
@armResourceOperations
interface Employees {
  delete is ArmResourceDeleteWithoutOkAsync<Employee, EmployeeProperties>;
}
```

## Suppression

Suppress per the RPC guidelines; otherwise use the standard Async templates.
