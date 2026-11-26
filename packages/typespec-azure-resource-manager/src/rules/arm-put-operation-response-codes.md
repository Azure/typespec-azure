This rule remains available for explicit configuration. The resource-manager and ARM library `all` rulesets disable it in favor of [`use-standard-response-codes`](../use-standard-response-codes), which includes the PUT success-response checks but leaves error responses to `missing-error-response` ([#6038](https://github.com/Azure/typespec-azure/pull/6038)). Move existing suppressions to the combined rule ID.

Put operations should use the `ArmResourceCreateOrReplaceAsync` or `ArmResourceCreateOrReplaceSync` template. They must have 200, 201, default and no other responses.

## Impact

- **Area:** API

The PUT operation returns response codes that violate the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [PutResponseCodes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/put-response-codes.md).

## ❌ Incorrect

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

## ✅ Correct

```tsp
@armResourceOperations
interface Employees {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use the standard createOrUpdate operation templates.
