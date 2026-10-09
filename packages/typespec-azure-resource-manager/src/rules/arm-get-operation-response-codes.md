ARM GET operations must return a `200` response. They may also return a `202` response and a default error response, but no other status codes. Use the successful resource response when reading a resource so callers and generated SDKs can access its representation.

## Impact

- **Area:** API, SDK

A GET without a `200` response cannot provide the resource expected by clients. Unexpected status codes make the operation's contract inconsistent with ARM response conventions.

## ❌ Incorrect

This customized read only returns `204` instead of the resource.

```tsp
model NoContent {
  @statusCode statusCode: 204;
}

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee, Response = NoContent>;
}
```

## ✅ Correct

Return an `ArmResponse<Employee>` so the read has a `200` response and the resource body.

```tsp
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee, Response = ArmResponse<Employee>>;
}
```

The default `ArmResourceRead<Employee>` response is also valid. A `202` response with a `Location` header is allowed in addition to `200`; header and default-error requirements are checked by their own rules.

## Suppression

Suppress only when preserving an existing API contract that cannot be changed. Otherwise, return the standard ARM resource read response and remove additional disallowed status codes.

## LintDiff Equivalent

This rule corresponds to the Swagger validator [GetResponseCodes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/get-response-codes.md). The temporary lintdiff rule uses provider namespace ancestry to isolate ARM declarations in a mixed runner; the official ARM rule uses the service boundary instead.
