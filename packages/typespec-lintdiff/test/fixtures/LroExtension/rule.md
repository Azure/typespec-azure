---
validatorRuleId: LroExtension
engine: spectral
coverageKind: lint
tspLints:
  - tsp-lintdiff-local-linter/lro-extension
---

# LroExtension

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Operations with a 202 response must specify `x-ms-long-running-operation: true`.
GET operations are excluded from validation as GET will have 202 only if it is a polling action.

## Source-of-truth notes

- Upstream defines `LroExtension` in `packages/rulesets/src/spectral/az-common.ts`
  as an OAS2 Spectral truthy check over
  `$.paths[*][put,patch,post,delete].responses[?(@property == '202')]^^`.
- Because the rule uses Spectral's `truthy` function, both a missing property and
  an explicit `x-ms-long-running-operation: false` are violations; only `true`
  satisfies the rule.
- GET is explicitly excluded by the selector. Upstream docs
  (`docs/lro-extension.md`) and the `bad-lro-post.json` workflow fixture both
  show the intended non-GET `202` sad path.
- I could not find a dedicated upstream `LroExtension` unit test, but nearby
  upstream tests still pin the same semantic boundary:
  `XMSLongRunningOperationProperty` exercises missing vs `true`/`false`
  extension values across PUT/PATCH/POST/DELETE, and `PostResponseCodes`
  treats a `202` POST as async only when `x-ms-long-running-operation: true`
  is present.

## Semantic coverage notes

- The upstream semantic matrix is:
  - non-GET `202` response with missing `x-ms-long-running-operation` => violation
  - non-GET `202` response with `x-ms-long-running-operation: false` => violation
  - non-GET `202` response with `x-ms-long-running-operation: true` => compliant
  - GET `202` response => ignored by selector
  - non-GET responses without `202` => ignored by selector
- The local violating and explicit-extension cases now use an ARM resource action
  POST so this rule is exercised in the ARM/error slice instead of an ad hoc
  data-plane repro.
- The violating `202` POST still requires suppressing
  `@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes`;
  without that suppression, normal ARM authoring never reaches the missing-LRO
  validator state.
- The explicit `true`/`false` extension cases additionally require suppressing
  `@azure-tools/typespec-azure-core/no-openapi`, so the truthy boundary is
  reproducible locally but still not cleanly authorable.
- `compliant-with-template` captures the authorable ARM success path: standard
  async PATCH/DELETE templates emit `x-ms-long-running-operation: true`
  automatically, while the same fixture's synchronous POST path stays outside
  the selector because it has no `202` response.
- The GET-excluded boundary remains documented rather than directly reproduced:
  a meaningful ARM GET `202` repro would already be dominated by adjacent GET/LRO
  constraints before this selector becomes the interesting signal.

The local outcome is now a **defense-in-depth local lint**:
`tsp-lintdiff-local-linter/lro-extension`.

It is intentionally narrow: it warns when authors define a non-GET ARM
operation with an explicit `202` response but do not make the operation
long-running. That means the lint mostly matters after an author has already
chosen to bypass normal template/response-code protections.

## Test Cases

| ID                       | Violation | Description |
| ------------------------ | --------- | ----------- |
| `missing-lro-for-202`    | true      | ARM resource-action POST returns `202` without `x-ms-long-running-operation`; requires `arm-post-operation-response-codes` suppression |
| `false-lro-extension`    | true      | Same ARM POST with explicit `x-ms-long-running-operation: false`; also requires `no-openapi` suppression |
| `with-lro-extension`     | false     | Same ARM POST with explicit `x-ms-long-running-operation: true`; also requires `no-openapi` suppression |
| `compliant-with-template` | false    | Standard ARM async templates emit `x-ms-long-running-operation: true` without suppressions and also keep sync POSTs outside the selector |
