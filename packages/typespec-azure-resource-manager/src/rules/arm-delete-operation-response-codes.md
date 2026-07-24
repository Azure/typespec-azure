## Synchronous

````

## Impact

- **Area:** API

The delete operation returns response codes that violate the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [DeleteResponseCodes](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

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
````

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
  delete is ArmResourceDeleteAsync<Employee>;
}
```

#### ✅ Correct

```tsp
@armResourceOperations
interface Employees {
  delete is ArmResourceDeleteWithoutOkAsync<Employee>;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use the standard delete operation templates.
