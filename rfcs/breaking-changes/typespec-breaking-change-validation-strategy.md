# TypeSpec Breaking Change Validation Strategy

## 1. Introduction

The TypeSpec breaking change detection tool cannot become a PR gate until it is validated against real-world breaking changes. The validation strategy must prove two things: first, that the TypeSpec-native detector finds the same contract regressions that the existing swagger-based workflow finds today; second, that it correctly detects TypeSpec-specific scenarios that swagger-based tools cannot represent well. The work therefore proceeds in phases, starting with parity against existing OAD coverage, then filling tool-specific gaps, then validating against historical production changes, and finally running side-by-side in CI before any gating decision is made.

## 2. Phase 1: OAD Test Conversion

The first phase is parity validation against the existing swagger-based toolchain.

### Goals

- Convert existing OAD (`openapi-diff`) and swagger breaking change tool tests into TypeSpec equivalents.
- Use `typespec-breaking-change-oad-correlation.md` as the source of truth for which OAD rules map to our `DiffKind` values and rule classifications.
- Demonstrate that our TypeSpec-native comparison is at least as sensitive as the current swagger-based validation for mapped rules.

### Approach

For each OAD rule that maps to our tool:

1. Locate the corresponding test cases in `Azure/openapi-diff`.
2. Identify the minimal before/after swagger change that causes OAD to report that rule.
3. Write equivalent TypeSpec source fixtures whose compiled HTTP contract produces the same semantic change.
4. Compile both fixtures to OpenAPI and confirm the emitted swagger would still trigger the same OAD finding.
5. Run our TypeSpec-native diff on the same fixture pair and assert that it produces the expected `DiffKind` and classification.

### Validation model

Each converted test should validate both paths:

- **TypeSpec-native validation:** base TypeSpec vs. head TypeSpec produces the expected `DiffKind` and rule result.
- **Swagger round-trip validation:** the emitted OpenAPI from those same fixtures would trigger the corresponding OAD rule.

This dual validation ensures the new tool is not only internally consistent, but also demonstrably aligned with the existing swagger-based enforcement model.

### Coverage tracking

Phase 1 must maintain a coverage matrix for every OAD rule in the correlation document:

- **Covered:** equivalent TypeSpec fixture exists and passes both validations.
- **N/A:** the rule is SDK-only, OpenAPI-structural, or otherwise outside the TypeSpec wire-contract scope.
- **Gap:** the rule should map, but no equivalent TypeSpec test exists yet.

The output of this phase is a living parity report that shows exactly which OAD rules are already validated and which still need work.

## 3. Phase 2: Gap Coverage

After parity work is complete, the next phase covers functionality that has no OAD equivalent or is underrepresented in swagger-based tests.

### Scope

This phase should add explicit tests for:

- DiffKinds unique to this tool, such as `TypeKindChanged` and rename-oriented DiffKinds.
- `RequestEncodingChanged` scenarios that are not just legacy `collectionFormat` analogs.
- Suppression behavior for `@approvedBreakingChange` and `@approvedUnversionedChange`.
- Phase A same-version regression cases, where OAD has limited comparable coverage.
- Two-decorator suppression tests that verify phase isolation.
- Edge cases involving open unions, `Record` type indexers, bidirectional models, and version scoping.

### Required test shapes

For each unique DiffKind or rule, add at least:

- one positive test that must produce the finding,
- one negative test that is structurally similar but must not produce the finding,
- suppression variants when the rule is suppressible,
- phase-specific assertions when the same structural diff is classified differently in Phase A vs. Phase B.

The goal of Phase 2 is to ensure the tool is not merely OAD-compatible, but fully validated for its own TypeSpec-native behavior.

## 4. Phase 3: Merged PR Analysis

Synthetic fixtures are necessary, but they are not enough. The third phase expands coverage using real breaking changes observed in merged PRs.

### Approach

- Sample merged PRs in `azure-rest-api-specs` that triggered breaking change labels or OAD violations.
- Extract the before/after source for each confirmed break.
- When TypeSpec exists, convert the exact change into TypeSpec fixtures directly.
- When only swagger exists, reconstruct the equivalent TypeSpec fixture that represents the same wire-level change.
- Validate that our tool detects the break and classifies it correctly.

### Prioritization

Prioritize:

- historically frequent rule triggers,
- changes that previously caused false positives,
- changes that previously caused false negatives,
- scenarios with complex versioning, polymorphism, or encoding behavior.

This phase gives the validation suite real-world depth and helps catch edge cases that synthetic authors may not anticipate.

## 5. Phase 4: Side-by-Side Evaluation

Before the tool can gate PRs, it should run in production beside the current swagger-based tool without affecting merge decisions.

### Deployment model

- Run both tools on every PR to `azure-rest-api-specs` and `typespec-azure`.
- The new TypeSpec tool posts **comments only** with its findings.
- It must not set labels, block merges, or otherwise alter the existing workflow during this phase.

### Evaluation goals

Compare the two tools on every eligible PR and track:

- agreement rate,
- cases where the new tool reports a finding and the swagger tool does not,
- cases where the swagger tool reports a finding and the new tool does not,
- execution latency and operational reliability.

### Dashboard metrics

The evaluation dashboard should report at least:

- agreement percentage per rule,
- false positive rate per `DiffKind`,
- false negative rate per OAD rule,
- latency comparison between the two tools.

### Duration

Run side-by-side for a fixed evaluation window before any gating decision is considered, such as 4-6 weeks or a minimum PR count large enough to make the metrics meaningful.

## 6. Phase 5: Graduated Gating

Promotion from comment-only evaluation to enforcement should happen gradually.

### Promotion criteria

The tool should only advance when:

- agreement rate is above the agreed threshold,
- false positive rate is below the agreed threshold,
- there are no known false negatives for Error-severity rules,
- the owning team has reviewed the results and signed off.

### Rollout stages

1. **Comment-only:** findings are informational only.
2. **Soft gate:** the tool applies labels but does not block merge.
3. **Full gate:** labels block merge unless reviewer approval or suppression policy allows the change.

The existing OAD workflow should continue running in parallel during the transition so the team has rollback safety if the new tool regresses.

## 7. Test Infrastructure

The validation plan requires dedicated test infrastructure rather than ad hoc fixture checks.

### Fixture format

Fixtures should be stored as pairs of TypeSpec inputs:

- `base` source,
- `head` source,
- expected `DiffKind` values,
- expected rule/classification results,
- optional suppression expectations,
- optional phase-selection metadata.

### Test runner responsibilities

The test runner should:

1. compile both fixture inputs,
2. run the comparison engine,
3. assert expected findings,
4. assert absence of unexpected findings,
5. optionally emit OpenAPI and run round-trip parity checks for Phase 1 fixtures.

### Regression support

- Use snapshot tests to capture full finding output for representative fixtures.
- Keep snapshots small and stable enough to make regressions obvious.
- Add performance benchmarks that record latency per comparison pair.
- Integrate the full suite into CI so these tests run on every PR to the tool package.

## 8. Success Criteria

Validation is complete only when all of the following are true:

- All mapped OAD rules have equivalent TypeSpec test coverage.
- All unique DiffKinds have at least one positive and one negative test.
- Side-by-side evaluation shows a false positive rate below the agreed threshold (for example, <5%).
- There are no known false negatives for Error-severity rules.
- Performance stays within the CI budget, such as less than 60 seconds for a typical spec comparison.

At that point, the team can make a data-backed decision to promote the TypeSpec-native detector from evaluation mode to merge-gating enforcement.
