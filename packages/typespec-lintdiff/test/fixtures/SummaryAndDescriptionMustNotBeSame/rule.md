---
validatorRuleId: SummaryAndDescriptionMustNotBeSame
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/summary-and-description-must-not-be-same
coverageKind: lint
tspRuleset: none
---

# SummaryAndDescriptionMustNotBeSame

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Validates that an operation's `summary` and `description` fields are not
identical after trimming surrounding whitespace. When they are the same, one of
them is redundant.

## Source-of-truth notes

- Upstream defines `SummaryAndDescriptionMustNotBeSame` in the shared
  `az-common` Spectral ruleset.
- The implementation only inspects operations and only reports when both fields
  are present.
- Comparison is exact after `trim()`: case and punctuation differences remain
  compliant.

## Authorability notes

- The upstream rule's behavior is fully authorable from TypeSpec using
  operation-level `@summary` and `@doc`.
- No ARM or data-plane templates are needed to reproduce the semantic branches,
  so this rule runs under `tspRuleset: none` to keep the fixture signal clean.

## Semantic coverage notes

The local lint covers the authorable upstream matrix:

- both `summary` and `description` present with identical text => violation
- both present with equality only after trimming surrounding whitespace =>
  violation
- both present with different text => compliant
- only one of the two fields present => compliant

## Detection Logic

The rule inspects each operation:

1. If both `summary` and `description` are present and their values are
   identical after trimming surrounding whitespace → warning.

## Test Cases

| ID                              | Violation | Description |
| ------------------------------- | --------- | ----------- |
| `same-summary-description`      | true      | Operation has identical summary and description text. |
| `same-after-trimming-whitespace`| true      | Operation summary and description only differ by surrounding whitespace. |
| `different-summary-description` | false     | Operation uses distinct summary and description text. |
| `summary-only`                  | false     | Operation defines a summary without a description. |
| `description-only`              | false     | Operation defines a description without a summary. |
