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
- the local lint mirrors the upstream path heuristic against ARM GET operations and requires the
  200-response model to declare only `value` and `nextLink`
- ARM templates already tend to emit compliant list models; the clean repro comes from a manually
  routed ARM collection GET

## Test Cases

| ID                       | Violation | Description                                                          |
| ------------------------ | --------- | -------------------------------------------------------------------- |
| `extra-collection-props` | yes       | Raw ARM collection GET response adds an extra top-level property     |
| `only-value-and-nextlink` | no       | Raw ARM collection GET response keeps only value and nextLink        |
