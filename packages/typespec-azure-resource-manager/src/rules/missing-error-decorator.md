Mark response models for HTTP 4xx and 5xx statuses with `@error`. The decorator
identifies an error response to tooling and generated SDKs. Mark the response
envelope itself, even when its `@body` already uses a marked error model.

HEAD responses with exactly status 404 are exempt: they can indicate that a
resource does not exist. Other HEAD error statuses still require `@error`.
Success responses and default responses are not checked.

This rule does not require operations to declare an error response or prescribe
its payload shape. Prefer the standard ARM templates and their default errors
when no explicit error status is needed.

## Impact

- **Area:** API design and generated SDKs

An unmarked error response can be treated as a successful response by generated
clients instead of following the client's error-handling path.

## Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

model BadRequest {
  @statusCode statusCode: 400;
  @body body: CommonTypes.ErrorResponse;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, Error = BadRequest>;
}
```

## Correct

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@error
model BadRequest {
  @statusCode statusCode: 400;
  @body body: CommonTypes.ErrorResponse;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, Error = BadRequest>;
}
```

If several response variants share a status, mark all of their response models
with `@error`. HTTP metadata uses the first variant as the representative response
type; the rule checks that representative, not each body variant.

## LintDiff Equivalent

This rule migrates
[`MissingXmsErrorResponse`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/missing-xms-error-response.md).
The AutoRest emitter sets `x-ms-error-response: true` for explicit-status
responses whose representative response model is marked with `@error`.

The native rule reports a warning per HTTP response status or range on the
operation. Swagger reports an error per emitted response entry. A native range
spanning both 4xx and 5xx can therefore produce one warning for two Swagger
response entries. The native rule checks HTTP operations without depending on
their placement under emitted `paths` or `x-ms-paths`.
