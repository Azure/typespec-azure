Long-running ARM operations must use `Azure.ResourceManager.CommonTypes.ErrorResponse`
for every existing default, 4xx, and 5xx response body.

The rule checks the TypeSpec model, not an emitted OpenAPI reference. Aliases,
`model is` copies, and nullable unions with a single non-null standard error type
are accepted. An external reference to the Swagger common-types `ErrorResponse`
does not make a custom TypeSpec model compliant.

## Impact

- **Area:** API design and generated SDKs

Using one standard error contract gives generated SDKs and Azure tooling a
consistent error shape across long-running operations. Custom, derived, inline,
primitive, collection, binary, and multipart error payloads are not substitutes
for `Azure.ResourceManager.CommonTypes.ErrorResponse`.

An error response without a body is not checked. Success responses, synchronous
operations, and GET operations are also outside this rule.
Operations are checked even without a `@service` decorator.

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
  restart is ArmResourceActionAsync<Widget, void, void, Error = CommonTypes.ErrorResponse>;
}
```

## LintDiff Equivalent

This rule promotes the LintDiff migration of the Swagger validator rule
[LroErrorContent](https://github.com/Azure/azure-openapi-validator/blob/a970d991d2785184d2786b85e0a345dc3f37bc25/docs/lro-error-content.md).
