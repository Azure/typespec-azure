Put operations should use the `ArmResourceCreateOrReplaceAsync` or `ArmResourceCreateOrReplaceSync` template. They must have 200, 201, default and no other responses.

## Impact

- **Area:** API

The PUT operation returns response codes that violate the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [PutResponseCodes](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

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
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use the standard createOrUpdate operation templates.
