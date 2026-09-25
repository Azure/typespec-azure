Non-GET long-running ARM operations must define at least one default, 4xx, or 5xx
error response and use `Azure.ResourceManager.CommonTypes.ErrorResponse` for every
such response body.

Aliases, unchanged `model is` copies, and nullable unions with a single non-null
standard error type are accepted. Responses may wrap the standard payload with
HTTP status codes and headers, including by spreading `CommonTypes.ErrorResponse`
into a response model. The rule checks the body after HTTP metadata is removed.
Copies that add payload fields or an indexer are not accepted.

## Impact

- **Area:** API design and generated SDKs

Using one standard error contract gives generated SDKs and Azure tooling a
consistent error shape across long-running operations. Independently defined
lookalikes, derived models, and primitive, collection, binary, or multipart error
payloads are not substitutes for `Azure.ResourceManager.CommonTypes.ErrorResponse`.

An error response without a body satisfies the response requirement; its absent
body is not checked. Success response bodies, synchronous operations, and GET
operations are outside this rule.
Operations are checked even without a `@service` decorator.

## Suppression

Suppress only when required to match an existing API; otherwise use
`Azure.ResourceManager.CommonTypes.ErrorResponse` for long-running operation
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

When an error response needs HTTP metadata, keep its payload standard:

```tsp
model Failure {
  ...CommonTypes.ErrorResponse;
  @statusCode status: 400;
  @header requestId: string;
}
```

The status code and header are not payload fields, so this wrapper is accepted.

## LintDiff Equivalent

This rule promotes the LintDiff migration of the Swagger validator rule
[LroErrorContent](https://github.com/Azure/azure-openapi-validator/blob/a970d991d2785184d2786b85e0a345dc3f37bc25/docs/lro-error-content.md).
Unlike the historical rule, it also rejects long-running operations with no
default, 4xx, or 5xx error response.
