Use standard ARM operation templates and their default
`Azure.ResourceManager.CommonTypes.ErrorResponse` error type. The standard error
contract is an ARM best practice for all operations, not only long-running ones.

This rule checks all operations, including synchronous operations and GETs, for
a default, 4xx, or 5xx error response and requires their error payloads to reference the standard model
directly. A model that merely copies its properties is not the standard error type.

## Impact

- **Area:** API design and generated SDKs

Using one standard error contract gives generated SDKs and Azure tooling a
consistent error shape across operations.

Success payloads are not checked. An error response with no body is rejected:
declaring an error status alone does not provide the standard error contract.

## Suppression

Suppress only when required to match an existing API; otherwise use
`Azure.ResourceManager.CommonTypes.ErrorResponse` for operation
error payloads.

## ❌ Incorrect

```tsp
@error
model CustomError {
  code: string;
  message: string;
}

@armResourceOperations
interface Widgets {
  restart is ArmResourceActionAsync<Widget, void, void, Error = CustomError>;
}
```

## ✅ Correct

```tsp
@armResourceOperations
interface Widgets {
  restart is ArmResourceActionAsync<Widget, void, void>;
}
```

`ArmResourceActionAsync` uses the standard `ErrorResponse` by default.

## LintDiff Equivalent

This rule promotes the LintDiff migration of the Swagger validator rule
[LroErrorContent](https://github.com/Azure/azure-openapi-validator/blob/a970d991d2785184d2786b85e0a345dc3f37bc25/docs/lro-error-content.md).
Unlike the historical rule, the native rule applies to all operations and also
rejects operations with no default, 4xx, or 5xx error response or with a bodyless
error response.
