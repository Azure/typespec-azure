Use standard ARM operation templates and their default
`Azure.ResourceManager.CommonTypes.ErrorResponse` error type. The standard error
contract is an ARM best practice for all operations, not only long-running ones.

This rule checks all operations, including synchronous operations and GETs, for
at least one response model marked with TypeSpec's `@error` decorator, including
an inherited marker. Every marked response's payload must reference the standard
model directly. A model that merely copies its properties is not the standard
error type.

Error classification follows TypeSpec's native error-model semantics, not HTTP
status codes. An unmarked 4xx or 5xx response does not satisfy the error-declaration
requirement and its payload is not checked. Conversely, a marked response is
checked even with an explicit non-error status code. Each marked response variant
is checked independently, including variants that share a status code.

## Impact

- **Area:** API design and generated SDKs

Using one standard error contract gives generated SDKs and Azure tooling a
consistent error shape across operations.

Unmarked response payloads are not checked. A marked error response with no body
is rejected outside HEAD.
HEAD is the exception because HTTP forbids a response body; its errors may be
bodyless, but it must still declare a response model marked with `@error`.

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
Unlike the historical status-based rule, the native rule identifies errors using
`@error`, applies to all operations, and rejects operations with no marked error
response or with a bodyless marked error response outside HEAD.
