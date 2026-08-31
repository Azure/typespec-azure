ARM operations must use `application/json` for request and response bodies. The rule checks the
resolved content types for every request and response body in an ARM provider namespace.

Using a consistent JSON representation keeps ARM APIs compatible with Azure tooling and gives
generated SDKs a predictable serialization format.

## Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model ExportRequest {
  format: string;
}

@post
op export(@header contentType: "text/plain", @body body: ExportRequest): {
  @statusCode statusCode: 200;
  @header contentType: "application/octet-stream";
  @body content: bytes;
};
```

## Correct

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model ExportRequest {
  format: string;
}

model ExportResponse {
  location: url;
}

@post
op export(@header contentType: "application/json", @body body: ExportRequest): {
  @statusCode statusCode: 200;
  @body result: ExportResponse;
};
```

## LintDiff Equivalent

This rule corresponds to the Swagger validator rule
[`NonApplicationJsonType`](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/az-arm.ts).
