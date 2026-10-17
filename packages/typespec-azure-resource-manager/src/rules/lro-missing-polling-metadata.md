ARM PUT, PATCH, POST, and DELETE operations whose `200`, `201`, `202`, or `204`
responses include `Location` or `Azure-AsyncOperation` headers must have native
polling metadata. These headers tell clients where to poll an asynchronous
operation. Use an asynchronous ARM template and preserve its semantic polling
headers so Azure tooling can recognize the polling contract.

Header names are case-insensitive. The rule reports the first qualifying header
property once per operation, in success-code order. Different operations sharing
a response property can each produce a warning on that property.

## Impact

- **Area:** API, SDK

A plain polling URL without polling metadata can cause generated clients to treat
an asynchronous operation as synchronous and omit polling behavior.

## ❌ Incorrect

The synchronous provider-action template accepts a response customization that
adds a polling URL without defining polling semantics:

```typespec
model Response {
  @statusCode statusCode: 202;
  @header("Location") location?: string;
}

@armResourceOperations
interface ProviderActions {
  start is ArmProviderActionSync<Request = void, Response = Response>;
}
```

## ✅ Correct

Use the asynchronous template, which supplies semantic polling headers:

```typespec
@armResourceOperations
interface ProviderActions {
  start is ArmProviderActionAsync<Request = void, Response = void>;
}
```

Both examples use `TypeSpec.Http` and `Azure.ResourceManager` in a configured ARM
service. Preserve semantic polling headers when customizing an asynchronous
template; replacing them with plain string headers removes the polling contract.

## Suppression

Suppress only for an existing API whose polling behavior has an approved exception.
Place the suppression on the reported header property and explain the exception.
Otherwise, use the asynchronous ARM template or supported semantic polling headers.

## LintDiff Equivalent

This rule corresponds to
[XMSLongRunningOperationProperty](https://github.com/Azure/azure-openapi-validator/blob/main/docs/xms-long-running-operation-property.md).
It checks native polling metadata rather than accepting an output-only
`x-ms-long-running-operation` override as a polling contract.
