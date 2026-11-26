ARM operations must define a response marked with `@error` and no explicit status code. This default error response covers failure status codes that are not explicitly declared. The requirement applies to every HTTP method, including HEAD, and to custom and resource operations.

Use the standard ARM operation templates with `CommonTypes.ErrorResponse`. A status-specific error, such as a marked `404` or `500`, does not cover otherwise undeclared failure status codes.

This rule checks for a default `@error` response, not its payload shape.

## Impact

- **Area:** API design and generated SDKs

A standard error response gives generated clients a consistent contract for unexpected failure status codes.

## ❌ Incorrect

Assume `Widget` is an ARM resource. Removing the template's error response leaves unexpected failure status codes without an error-response contract.

```tsp
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, Error = never>;
}
```

## ✅ Correct

```tsp
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```

Retain an operation without a generic error response only when required to preserve an existing, ARM-reviewed API contract.

## LintDiff Equivalent

This rule implements the shared ARM error-response guideline from [MissingDefaultResponse](https://github.com/Azure/azure-openapi-validator/blob/main/docs/missing-default-response.md) and [RequiredDefaultResponse](https://github.com/Azure/azure-openapi-validator/blob/main/docs/required-default-response.md).
