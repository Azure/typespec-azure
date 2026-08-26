---
validatorRuleId: GetCollectionOnlyHasValueAndNextLink
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/get-collection-only-has-value-and-next-link
---

# GetCollectionOnlyHasValueAndNextLink

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Collection GET responses must only have `value` and `nextLink` properties. Extra properties
beyond these two are not allowed in the collection response model.

## Current outcome

Classification: true gap.

The original template-based fixture was stale: current ARM template output no longer reproduced
the upstream validator. A corrected raw ARM GET fixture that emits a static collection path now
reproduces the validator cleanly with no prerequisite TypeSpec diagnostics, so native lint
coverage is warranted.

## Semantic coverage notes

- upstream scope is ARM GET collection paths whose emitted path does not end in `}`, `operations`,
  or `default`
- the local lint mirrors the upstream provider-tail path heuristic against ARM GET operations and
  requires object 200-response models to declare only `value` and `nextLink`
- direct array response schemas do not expose `schema.properties` in Swagger and are skipped
- non-collection point GET paths with an odd provider-tail segment count are skipped even when
  their response shape would be invalid for a collection GET
- ARM templates already tend to emit compliant list models; the clean repro comes from a manually
  routed ARM collection GET

## Test Cases

| ID                            | Violation | Description                                                       |
| ----------------------------- | --------- | ----------------------------------------------------------------- |
| `extra-collection-props`      | yes       | Raw ARM collection GET response adds an extra top-level property  |
| `extension-scope-value-only`  | yes       | Provider-tail collection path response declares only `value`      |
| `only-value-and-nextlink`     | no        | Raw ARM collection GET response keeps only value and `nextLink`   |
| `array-response-body`         | no        | Named array response body has no Swagger `schema.properties` node |
| `direct-array-response-body`  | no        | Direct `T[]` response body has no Swagger `schema.properties` node |
| `terminal-resource-invalid-response` | no | Odd provider-tail point GET skips an otherwise invalid response |
