## Synchronous

````

## Impact

- **Area:** API

The POST operation returns response codes that violate the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [PostResponseCodes](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

## Synchronous

Synchronous post operations should have one of the following combinations of responses - 200 and default, or 204 and default. They must have no other responses.

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

Long-running (LRO) post operations should have 202 and default responses. The must also have a 200 response only if the final response is intended to have a schema. They must have no other responses. The 202 response must not have a response schema specified.

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

Suppress only when required to match an existing API; otherwise use the standard resource action or provider action templates.
