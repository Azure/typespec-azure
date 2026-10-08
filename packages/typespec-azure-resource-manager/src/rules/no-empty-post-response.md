Synchronous ARM resource POST operations returning 200 must return a response body.
Use a 204 response when the operation completes without a payload. Response headers
are metadata, not a response body. An explicitly declared empty model payload is
still a body.

The rule reports one warning on an operation when any of its 200 response variants
has no HTTP payload. It checks resource lifecycle and action operations, excluding
long-running operations. Other rules check allowed status-code combinations and
bodies forbidden on 202/204 responses.

This rule is available for explicit opt-in and is disabled in the Azure resource
manager ruleset by default.

## Incorrect

For an `Employee` ARM resource, the following response customization returns 200
without a payload:

```tsp
@armResourceOperations
interface Employees {
  hire is ArmResourceActionSync<
    Employee,
    void,
    Response = {
      @statusCode _: 200;
    }
  >;
}
```

## Correct

Use the same synchronous action template with a 204 response:

```tsp
@armResourceOperations
interface Employees {
  hire is ArmResourceActionSync<Employee, void, Response = ArmNoContentResponse>;
}
```

Alternatively, retain 200 and provide a response payload.

## Impact

- **Area:** API
- **Impact:** A 200 success response without the expected payload makes the response
  contract inconsistent and can confuse clients. A 204 response explicitly
  communicates that there is no content to consume.

## Suppression

Suppress this rule only when preserving an existing API's approved response
contract requires a bodyless 200 response. For a new API, use 204 instead.

## LintDiff Equivalent

This rule covers the synchronous resource POST missing-body check from
[`PostResponseCodes`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/post-response-codes.md).
The mapping is partial: existing official rules retain status-code and async-body
checks. This rule does not reproduce legacy LRO response representations or
inspect provider actions outside the ARM resource-operation population.
