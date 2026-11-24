ARM operations must include a standard error response for failure status codes that are not explicitly declared. This applies to every HTTP method, including HEAD, and to custom operations as well as resource operations.

Use the standard ARM operation templates with `CommonTypes.ErrorResponse`. A response marked with `@error` and no explicit status code provides generic error handling. A status-specific error, such as a marked `404` or `500`, does not cover otherwise undeclared failure status codes.

This rule checks the presence of a response covering otherwise undeclared status codes, not its payload shape or error marking. Those requirements are checked separately by `use-standard-error`. Each rule reports independently: enabling this rule together with existing ARM response-code or missing-error checks can produce multiple diagnostics for an operation without a generic error response.

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

## Suppression

Retain an operation without a generic error response only when required to preserve an existing, ARM-reviewed API contract. Apply `#suppress "@azure-tools/typespec-azure-resource-manager/require-standard-error-response" "Existing ARM-reviewed response contract retained for compatibility."` to the concrete operation. Other rules' diagnostics require their own suppressions.

## LintDiff Equivalent

This rule implements the shared ARM error-response guideline from [MissingDefaultResponse](https://github.com/Azure/azure-openapi-validator/blob/main/docs/missing-default-response.md) and [RequiredDefaultResponse](https://github.com/Azure/azure-openapi-validator/blob/main/docs/required-default-response.md).
