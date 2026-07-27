---
validatorRuleId: XmsPageableForListCalls
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/xms-pageable-for-list-calls
coverageKind: lint
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
tspRuleset: resource-manager
---

# XmsPageableForListCalls

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

GET operations that return arrays must have `x-ms-pageable` set.

## Source-of-truth notes

- Upstream ARM registration (`packages/rulesets/src/spectral/az-arm.ts`) runs this rule on
  ARM GET paths that do not end in `}` or `/default`, then delegates to
  `xms-pageable-for-list-calls.ts`.
- The Spectral function itself is path-driven: it first rejects non-list paths via
  `isListOperationPath(...)`, then reports only when the selected GET operation omits
  `x-ms-pageable`.
- Upstream tests cover:
  - violating top-level, `{scope}`, and `/{resourceUri}` list paths without `x-ms-pageable`
  - compliant list paths that include `x-ms-pageable`
  - ignored selector-boundary paths ending in `}` or `/default`

## TypeSpec source notes

- Standard ARM list templates already emit `x-ms-pageable`; the
  `compliant-with-template` fixture captures that clean authorable path with no validator or
  TypeSpec diagnostics.
- Raw ARM-style GET list operations are still authorable in this harness, but they emit
  `@azure-tools/typespec-azure-resource-manager/arm-resource-operation` because they bypass
  `@armResourceOperations`.
- The repaired `list-without-pageable` fixture now covers two violating raw list paths plus raw
  singleton and `/default` selector-boundary shapes, all without suppressions. The validator only
  reports the true list paths, while TypeSpec consistently warns that the raw operations bypass ARM
  resource-operation templates.

The local outcome is now a **defense-in-depth local lint**:
`tsp-lintdiff-local-linter/xms-pageable-for-list-calls`.

Standard ARM templates still provide the main protection, but raw template-bypass
GET list operations now get an additional targeted warning instead of relying only
on the more generic `arm-resource-operation` diagnostic.

## Semantic coverage notes

The repaired local suite covers the authorable ARM matrix needed for migration screening:

- top-level raw ARM list path without `x-ms-pageable` => validator violation + `arm-resource-operation`
- `/{resourceUri}` raw ARM list path without `x-ms-pageable` => validator violation + `arm-resource-operation`
- raw ARM path ending in `}` => ignored even with a list-shaped response body
- raw ARM path ending in `/default` => ignored even with a list-shaped response body
- standard ARM list templates => compliant because the emitter supplies `x-ms-pageable`

The upstream `{scope}` placeholder variant is the same selector-parity behavior after the provider
namespace as the `/{resourceUri}` raw fixture, so it is documented source-of-truth coverage rather
than a separate local authoring case.

## Test Cases

| ID                      | Violation | Description |
| ----------------------- | --------- | ----------- |
| `compliant-with-template` | false   | Standard ARM list templates emit `x-ms-pageable` without suppressions |
| `list-without-pageable` | true      | Raw ARM list paths omit `x-ms-pageable`; sibling singleton and `/default` paths stay ignored while raw operations warn via `arm-resource-operation` |
