Use standard ARM operation templates and their default
`Azure.ResourceManager.CommonTypes.ErrorResponse` error type.

This rule checks all operations except HEAD for at least one response model
marked with TypeSpec's `@error` decorator. Every `@error` response's payload must
reference the standard `Azure.ResourceManager.CommonTypes.ErrorResponse` model.

Error bodies must use the standard model directly, including through aliases or
an explicit `@body` property.

## Impact

- **Area:** API design and generated SDKs

Using one standard error contract gives generated SDKs and Azure tooling a
consistent error shape across operations.

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
