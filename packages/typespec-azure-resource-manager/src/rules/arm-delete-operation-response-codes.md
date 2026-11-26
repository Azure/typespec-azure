This rule remains available for explicit configuration. The resource-manager and ARM library `all` rulesets disable it in favor of [`use-standard-response-codes`](../use-standard-response-codes), which includes the DELETE success-response checks but leaves error responses to `missing-error-response` ([#6038](https://github.com/Azure/typespec-azure/pull/6038)). Move existing suppressions to the combined rule ID.

## Impact

- **Area:** API

The delete operation returns response codes that violate the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [DeleteResponseCodes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/delete-response-codes.md).

## Synchronous

Synchronous delete operations should use the `ArmResourceDeleteSync` template. They must have 200, 204, default and no other responses.

### ❌ Incorrect

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

### ✅ Correct

```tsp
@armResourceOperations
interface Employees {
  delete is ArmResourceDeleteSync<Employee>;
}
```

## Asynchronous

Long-running (LRO) delete operations should use the `ArmResourceDeleteWithoutOkAsync` template. They must have 202, 204, default, and no other responses.

### ❌ Incorrect

```tsp
@armResourceOperations
interface Employees {
  delete is ArmResourceDeleteAsync<Employee>;
}
```

### ✅ Correct

```tsp
@armResourceOperations
interface Employees {
  delete is ArmResourceDeleteWithoutOkAsync<Employee>;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use the standard delete operation templates.
