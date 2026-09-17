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
  are nonempty before trimming.
- Comparison is exact after `trim()`: case and punctuation differences remain
  compliant.

## Authorability notes

- The upstream value comparison is authorable from TypeSpec using
  operation-level `@summary`, `@doc`, or doc comments. Its emitted-operation
  population is not identical to the compiler's semantic-operation population.
- No ARM or data-plane templates are needed to reproduce the semantic branches,
  so this rule runs under `tspRuleset: none` to keep the fixture signal clean.

## Semantic coverage notes

The local lint covers the authorable upstream matrix:

- both `summary` and `description` present with identical text => violation
- both present with equality only after trimming surrounding whitespace =>
  violation
- either field present as the empty string => compliant, matching the upstream
  rule's truthy check before trimming
- both present with different text => compliant
- only one of the two fields present => compliant

## Detection Logic

The rule inspects each operation:

1. If both `summary` and `description` are nonempty and their values are
   identical after trimming surrounding whitespace → warning.

The compiler walker also visits a concrete operation alias's instantiated
`sourceOperation`. Both distinct project-owned targets can be diagnosed.
Library-location exclusion comes from the compiler lint context, not emitter
inspection or a private rule-specific filter.

## Native metadata matrix

The production rule only reads supported compiler metadata. For emission
research, AutoRest's `packages/typespec-autorest/src/openapi.ts:585-587` assigns
endpoint `summary` and `description` directly from the same `getSummary` and
`getDoc` APIs. The field/value column below describes an exposed HTTP operation;
compiler-only tests do not import or invoke that emitter.

| Authored shape                                           | Validity/support                                                      | HTTP field/value category                                                              | Swagger result              | Native result and evidence                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| Concrete operation with equal nonempty `@summary`/`@doc` | Supported                                                             | Both present, equal strings                                                            | Warning                     | Warning; `same-summary-description` and native test                                          |
| Same text with surrounding whitespace                    | Supported                                                             | Both present, equal after trim                                                         | Warning                     | Warning; `same-after-trimming-whitespace` and native test                                    |
| Doc comment supplies description equal to `@summary`     | Supported                                                             | Both present, equal strings                                                            | Warning                     | Warning; native doc-comment test and emitter assignment above                                |
| Different text, case, or punctuation                     | Supported                                                             | Both present, unequal trimmed strings                                                  | None                        | None; comparison control and native cases                                                    |
| One or neither metadata value                            | Compiler-valid; missing docs may trigger other Azure rules            | Missing fields omitted                                                                 | None                        | None; summary-only/description-only fixtures and native controls                             |
| Either/both values are empty strings                     | Compiler-valid; empty docs trigger `descriptive-description-required` | Empty string fails the validator truthy precondition                                   | None                        | None from this rule; empty fixture and native cases                                          |
| Project-defined operation-template alias                 | Supported native operations                                           | Concrete HTTP endpoint inherits metadata; no separate endpoint for instantiated source | Warning on emitted endpoint | Warnings on alias and distinct instantiated source; native test asserts both names/locations |
| Inherited interface operation inside a nested namespace  | Supported                                                             | Endpoint inherits the operation metadata                                               | Warning when equal          | Warning; native inherited/nested test                                                        |
| Model/property summary and documentation                 | Supported, but outside this rule's operation surface                  | Not operation metadata                                                                 | Not inspected by this rule  | None; native non-operation control                                                           |
| Imported ARM operations-template member                  | Library-owned target, not a project-authored declaration              | Generated endpoint may have equal strings                                              | Warning on emitted endpoint | Library-location diagnostics excluded by compiler context; Datadog example in `migration.md` |

Whitespace-only nonempty strings still reach the trim comparison, but an empty
or whitespace-only description is independently rejected by
`descriptive-description-required`. No special-case logic is added to simulate
emission for those already-warned authoring shapes.

## Test Cases

| ID                               | Violation | Description                                                              |
| -------------------------------- | --------- | ------------------------------------------------------------------------ |
| `same-summary-description`       | true      | Operation has identical summary and description text.                    |
| `same-after-trimming-whitespace` | true      | Operation summary and description only differ by surrounding whitespace. |
| `different-summary-description`  | false     | Operation uses distinct summary and description text.                    |
| `empty-summary-description`      | false     | Operation has empty summary and description strings.                     |
| `summary-only`                   | false     | Operation defines a summary without a description.                       |
| `description-only`               | false     | Operation defines a description without a summary.                       |
