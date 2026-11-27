[`use-standard-response-codes`](../use-standard-response-codes) also includes these PUT success-response checks, without requiring a default error response. It applies them to every PUT operation inside a service, not only to registered resource operations. The resource-manager ruleset still enables this rule and leaves `use-standard-response-codes` disabled.

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
