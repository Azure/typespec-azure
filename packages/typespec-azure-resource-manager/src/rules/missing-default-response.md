ARM operations must include a default response for status codes that are not explicitly declared. This applies to every HTTP method, including HEAD, and to custom operations as well as resource operations.

Use the standard ARM operation templates with their default `CommonTypes.ErrorResponse`. A response marked with `@error` and no explicit status code provides a default response. A status-specific error, such as a marked `404` or `500`, does not replace the default response.

This rule checks the presence of the fallback, not its payload shape or error marking. Those requirements are checked separately by `use-standard-error`. Each rule reports independently: enabling this rule together with existing ARM response-code or missing-error checks can produce multiple diagnostics for an operation without a default response.

## Impact

- **Area:** API design and generated SDKs

A default error response gives generated clients a consistent contract for unexpected failure status codes.

## ❌ Incorrect

Assume `Widget` is an ARM resource. Removing the template's error response leaves no default response.

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

Retain a missing default response only when required to preserve an existing, ARM-reviewed API contract. Apply `#suppress "@azure-tools/typespec-azure-resource-manager/missing-default-response" "Existing ARM-reviewed response contract retained for compatibility."` to the concrete operation. Other rules' diagnostics require their own suppressions.

## LintDiff Equivalent

This rule implements the shared default-response guideline documented by [MissingDefaultResponse](https://github.com/Azure/azure-openapi-validator/blob/main/docs/missing-default-response.md) and [RequiredDefaultResponse](https://github.com/Azure/azure-openapi-validator/blob/main/docs/required-default-response.md), using one diagnostic rather than two validator aliases.

The legacy `RequiredDefaultResponse` checks response maps for a truthy `default`. The Spectral `MissingDefaultResponse` implementation selects response keys and applies `truthy` to those nonempty strings, so it does not detect ordinary missing defaults. The native rule follows the documented requirement rather than reproducing that selector defect. It checks concrete TypeSpec operations, including shapes emitted under `x-ms-paths`, without claiming equal emitted diagnostic counts.
