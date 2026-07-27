---
validatorRuleId: XmsResourceInPutResponse
engine: spectral
coverageKind: lint
tspLints:
  - tsp-lintdiff-local-linter/xms-resource-in-put-response
---

# XmsResourceInPutResponse

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

PUT 200 response models must have `x-ms-azure-resource` in their hierarchy.

## Source-of-truth notes

- Upstream registers this as ARM Spectral rule `RPC-Put-V1-12` over
  `"$[paths,'x-ms-paths'].*.put"` with helper `withXmsResource`.
- The implementation is narrow: it looks at the first `200`/`201` response
  schema and returns success only when that schema, or one of its inline `allOf`
  bases, carries `x-ms-azure-resource: true`.
- The upstream unit tests cover one violating `put` case and one compliant
  `put` case with `x-ms-azure-resource: true`; they also imply the selector
  boundary because only `put` operations are exercised by the rule.

## Local migration evidence

- The previous local import used one mixed fixture containing both:
  - a raw custom `put` operation returning a non-resource model, and
  - a standard ARM template `Widgets_CreateOrUpdate` path.
- That mixed fixture was not trustworthy. The stored validator snapshot reported
  both operations as violations even though the emitted `Widget` schema inherits
  from external common-types ARM resource definitions.
- Upstream helper `withXmsResource` only checks `schema["x-ms-azure-resource"]`
  and recursively walks inline `allOf` members; it does not resolve external
  `$ref` ancestry itself. That makes the prior template-based compliant proof too
  noisy for migration decisions.
- The repaired local import now uses explicit controls instead:
  - raw ARM-style `put` without `x-ms-azure-resource` => validator violation
  - raw ARM-style `put` with explicit `@extension("x-ms-azure-resource", true)`
    => validator-compliant control
  - raw ARM-style `patch` without `x-ms-azure-resource` => selector-boundary
    control proving the rule only inspects `put`

## Blocking and prerequisite findings

- The violating and selector-boundary repros both require suppressing
  `@azure-tools/typespec-azure-resource-manager/arm-resource-operation` because
  they use raw custom ARM paths instead of standard resource templates.
- The compliant control also requires suppressing
  `@azure-tools/typespec-azure-core/no-openapi` so the fixture can author the
  raw `x-ms-azure-resource` extension directly.
- The local outcome is now a **defense-in-depth local lint**:
  `tsp-lintdiff-local-linter/xms-resource-in-put-response`. The rule is meant to
  catch authors who bypass ARM resource templates and manually define a PUT
  success response that is not an Azure resource and does not carry explicit
  `x-ms-azure-resource` semantics.

## Semantic coverage notes

The repaired local suite covers the strongest useful upstream semantic matrix:

- `put` + response schema without `x-ms-azure-resource` => invalid
- `put` + response schema with explicit `x-ms-azure-resource` => valid
- `patch` + response schema without `x-ms-azure-resource` => ignored by selector

What remains distinct from the upstream Swagger helper is that the local lint
uses TypeSpec/ARM resource semantics directly instead of reproducing the
OpenAPI helper's `$ref`-walking limitation. That is intentional for this
defense-in-depth check.

## Test Cases

| ID | Violation | Description |
| --- | --------- | ----------- |
| `put-missing-azure-resource` | true | Raw ARM-style PUT returns a custom model without `x-ms-azure-resource` |
| `put-with-azure-resource` | false | Raw ARM-style PUT returns a model with explicit `x-ms-azure-resource: true` |
| `patch-ignored` | false | Raw ARM-style PATCH returns a non-resource model but is ignored because the rule only selects PUT |
