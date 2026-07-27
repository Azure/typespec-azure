---
validatorRuleId: MissingXmsErrorResponse
engine: native
tspLints:
  - tsp-lintdiff-local-linter/missing-xms-error-response
---

# MissingXmsErrorResponse

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Native

## Description

Explicit ARM `4xx`/`5xx` responses should be marked with `@error` so the emitter
generates `x-ms-error-response: true`. The one upstream exception is `HEAD 404`.

## Source-of-truth notes

- Upstream `azure-openapi-validator` implements this as native rule `R4032`.
- The implementation walks every ARM response object and reports when a `4xx` or
  `5xx` response omits `x-ms-error-response`.
- `HEAD 404` is the only special case: the implementation returns early and does
  not check for `x-ms-error-response` at all.
- Upstream native tests cover the core violating shape with
  `ErrorResponseMissing.json`, expecting two violations (`400` and `500`).

## Local migration evidence

- `head-500-without-xms-error-response` is a clean, authorable ARM repro with no
  suppressions and no unrelated TypeSpec diagnostics. It proves a direct local
  lint can detect the same missing-marker shape as the validator.
- `head-500-explicit-xms-error-response` is the clean compliant counterpart:
  adding `@error` emits `x-ms-error-response: true` and clears both systems.
- `head-404-exception` captures the upstream selector boundary. A `HEAD 404`
  response without `@error` remains compliant because the validator ignores it.
- `standard-error-response` shows the semantic boundary on the response envelope:
  using `Azure.ResourceManager.CommonTypes.ErrorResponse` as the body is still not
  enough for an explicit `404` when the enclosing response model is not marked
  `@error`.
- `error-without-xms-error-response` keeps the custom-body variant of the same
  boundary. It is now left unsuppressed so the remaining unrelated diagnostics are
  visible instead of being mistaken for prerequisites.
- `default-error-response-pattern` remains the clean template control: default ARM
  error handling stays compliant because no explicit non-default error response is
  emitted.

The repaired evidence now supports a direct local lint:
`tsp-lintdiff-local-linter/missing-xms-error-response`. The rule checks ARM
operations for explicit `4xx`/`5xx` responses whose response model is not marked
`@error`, while preserving the upstream `HEAD 404` exception.

## Test Cases

| ID | Violation | Description |
| --- | --------- | ----------- |
| `head-500-without-xms-error-response` | true | Clean ARM `HEAD 500` response without `@error` reproduces the validator violation with no suppressions |
| `head-500-explicit-xms-error-response` | false | Marking the `HEAD 500` response as `@error` emits `x-ms-error-response: true` |
| `head-404-exception` | false | `HEAD 404` remains compliant without `@error`, matching the upstream exception |
| `error-without-xms-error-response` | true | Custom POST `404` response with a custom error body still violates when the response envelope is not marked `@error` |
| `standard-error-response` | true | Using the standard ARM `ErrorResponse` body alone is still not enough for an explicit `404` response |
| `default-error-response-pattern` | false | Default ARM error handling path stays compliant without custom `4xx`/`5xx` responses |
| `explicit-xms-error-response` | false | Marking the explicit POST `404` response as `@error` emits `x-ms-error-response: true` |
