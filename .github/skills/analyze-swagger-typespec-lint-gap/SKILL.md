---
name: analyze-swagger-typespec-lint-gap
description: Investigate coverage or diagnostic-count gaps between a Swagger validator rule and its migrated TypeSpec lint rule, determine functional equivalence, and document the evidence. Use when reports disagree, project coverage differs, or Swagger and TypeSpec diagnostic totals do not match.
---

# Analyze Swagger and TypeSpec Lint Gaps

Investigate differences between a Swagger validator rule and its migrated
TypeSpec lint rule without assuming that raw diagnostic counts must be equal.
Produce reproducible evidence and a migration conclusion.

## Inputs

Collect or identify:

- Swagger validator rule ID.
- Mapped TypeSpec lint rule ID.
- Spec repo or lint-diff worktree.
- The local snapshot of the external migration coverage report:
  `packages/typespec-lintdiff/docs/coverage_old.md`.
- The lint-diff observed coverage report:
  `packages/typespec-lintdiff/specs/coverage-breakdown.md`.
- Source revision, generation time, and generator revision for both reports.
- Validator and TypeSpec per-project diagnostic files.
- Rule fixtures, including violating and compliant cases.

If a report provides only aggregate counts, explicitly record that individual
unmatched projects cannot be reconstructed from it.

## Workflow

### 1. Reconcile the two coverage reports

Always examine both reports before investigating an individual rule. Do not
compare their category totals or coverage percentages as if they used the same
definition.

The external gist and the lint-diff report answer different questions:

| Dimension | External gist | Lint-diff `coverage-breakdown.md` |
| --- | --- | --- |
| Primary question | Is there some migration disposition or coverage, including official rules and structurally prevented cases? | Did mapped TypeSpec diagnostics occur in the same successfully compiled projects as validator diagnostics? |
| Coverage credit | Local lint, official mapping, blocked/infallible classification, and some never-fired mappings | Observed same-project diagnostic overlap only; mapping alone receives no credit |
| Main columns | `Fired`, `Lint`, `Official`, `Pct` | `Fired`, `TSP Fired`, `Lint/Overlap`, `Gap`, `TSP Only`, raw diagnostic totals |
| Rule modes | May combine or omit execution-policy distinctions | Separates normal `production` validation from explicitly evaluated `stagingOnly` rules |
| Diagnostic detail | Primarily aggregate project coverage | Project sets plus raw validator and TypeSpec diagnostic cardinality |

Record the headline population shown by each concrete report. For example, the
referenced gist currently says 450 compiled projects and 210 validator rules,
while the checked-in lint-diff report says 462 of 468 projects and 215 known
validator rules. Treat these values as report-version evidence, not permanent
constants.

For the rule under investigation, create a reconciliation table containing:

- Row and category in each report.
- Validator projects fired.
- Locally migrated TypeSpec projects fired.
- Official-rule projects credited.
- Same-project overlap.
- Validator-only and TypeSpec-only projects when available.
- Production or staging execution mode.
- Raw diagnostic totals, if reported.

If a report contains only aggregate counts, do not infer which project is
missing by subtracting totals. Reproduce or obtain per-project results.

Classify every cross-report number gap using one or more of these causes, in
this order:

1. **Different snapshots or population:** spec commit, report date, generator
   revision, compile-success set, or validator rule catalog changed.
2. **Different coverage definition:** the gist may credit an official mapping,
   blocked/infallible behavior, or a mapped rule that never fired; lint-diff
   requires observed diagnostics in the same project.
3. **Different validator execution mode:** a `stagingOnly` rule is zero in a
   production run but can fire in a separately labeled staging run.
4. **Different API-version scope:** all emitted Swagger versions or an
   unprojected TypeSpec program can disagree with newest-version Swagger and a
   TypeSpec program projected to that version.
5. **Different failure/exclusion policy:** TypeSpec compile failures, parse
   failures, external references, suppressions, or generated projects may be
   included on only one side.
6. **Different mapping set:** official rules, local temporary rules, renamed
   rules, one-to-many mappings, and fixture metadata may differ.
7. **Different aggregation identity:** project counts, raw emitted Swagger
   occurrences, deduplicated JSON paths, and TypeSpec source locations are not
   interchangeable.
8. **Real semantic difference:** only after the preceding causes are ruled out
   should the gap be attributed to missing or extra rule behavior.

State the evidence for the selected cause. “The reports use different
methodologies” is not sufficient without identifying the exact dimension and
showing how it changes the reported row.

### 2. Establish comparable populations

Before comparing results, document for each report:

- Pinned spec commit and project denominator.
- Successfully compiled and failed projects.
- ARM, data-plane, or combined ruleset scope.
- Swagger execution path, including reference resolution.
- API-version policy: all versions, readme tag, or latest version.
- TypeSpec execution mode: source program or version projection.
- Suppression and exclusion policies.

Do not attribute a difference to rule behavior until these dimensions are
aligned. Exclude TypeSpec compile failures from both sides of a behavioral
comparison, while retaining failure details in machine-readable metadata.

### 3. Compare project sets first

Build these sets over the aligned population:

- Validator projects.
- TypeSpec projects.
- Overlap.
- Validator-only projects.
- TypeSpec-only projects.

Project-level overlap answers whether both rules recognize the same affected
services. It is separate from diagnostic cardinality.

Inspect every one-sided project. Determine whether the difference comes from:

- Older API-version declarations.
- Source models not emitted by the selected service version.
- Unreachable or library declarations.
- External references.
- Compile failures.
- A real semantic rule gap.

For version-sensitive rules, project TypeSpec to the same API version selected
for Swagger. Follow the emitter's versioning approach rather than filtering
diagnostics by filename or guessing from declaration names.

### 4. Verify rule semantics with fixtures

Read the Swagger rule implementation and the TypeSpec rule implementation.
List every authorable surface the Swagger rule can diagnose, such as:

- Model properties.
- Parameters.
- Request bodies.
- Response bodies.
- Operations or schemas.

Require violating fixtures for each applicable surface and at least one
compliant control. Run the repository's validation command and use
`audit:noise` to find incidental or unmapped fixture diagnostics.

`audit:noise` is supporting evidence only. It does not establish target
identity, prove compliant behavior, or replace real-service analysis.

### 5. Analyze raw diagnostic cardinality

Record raw validator and TypeSpec diagnostic totals, but do not use their
equality as the migration criterion.

Swagger rules run over emitted OpenAPI occurrences. TypeSpec rules run over
semantic source targets. One TypeSpec declaration may produce multiple Swagger
occurrences through:

- Multiple emitted files.
- Visibility variants.
- Inheritance or flattening.
- Model spreads and template instantiations.
- Reused schemas.
- Generated or externally referenced definitions.

TypeSpec may also report multiple semantic targets that share an emitted name.

### 6. Apply conservative deduplication

Calculate at least these identities:

- Validator raw identity: project + Swagger file + JSON path.
- Validator file-independent identity: project + JSON path.
- TypeSpec source identity: project + source file + line + column.

Report:

- Raw totals.
- Deduplicated totals.
- Projects with equal counts.
- Projects where the validator is higher.
- Projects where TypeSpec is higher.
- Total positive and negative differences, not only the net difference.

Deduplicated Swagger paths and TypeSpec source locations remain different
identity domains. Similar or equal totals are evidence, not proof of one-to-one
matching.

### 7. Investigate outliers

Sort projects by absolute deduplicated difference and inspect the largest
validator-higher and TypeSpec-higher cases.

For each outlier:

1. Group validator findings by schema or operation, property name, parameter
   location, and JSON path.
2. Group TypeSpec findings by source location, target kind, and encoded name.
3. Determine whether one source target maps to multiple emitted paths.
4. Identify generated, library, or externally referenced Swagger nodes.
5. Check whether repeated encoded names cause unrelated TypeSpec targets to be
   retained.
6. Separate model-property, parameter, request-body, and response-body cases.

Do not normalize solely by property name. Common names such as `enabled` can
collide across unrelated models and operations.

### 8. Decide whether stronger normalization is valid

Add a rule-specific canonical identity only when it is:

- Deterministic.
- Based on the semantic concept enforced by both rules.
- Available for all diagnostics in the intended rule scope.
- Collision-resistant.
- Independently testable with fixtures and sampled real projects.

When possible, prefer emitter source maps or instrumentation that maps an
emitted Swagger node to its originating TypeSpec target. If no reliable mapping
exists, preserve the two cardinalities and judge equivalence behaviorally.

### 9. Reach the migration conclusion

Accept the migrated TypeSpec rule as functionally equivalent when:

- Violating and compliant fixtures establish matching semantics.
- The compared populations and API-version scopes are aligned.
- Validator projects are covered by TypeSpec diagnostics.
- TypeSpec-only projects are explained or eliminated by correct projection.
- Residual cardinality differences are explained by source-to-emission
  multiplicity, references, generated structures, or identity collisions.
- No investigated outlier demonstrates a missing or extra semantic check.

Raw diagnostic equality is not required when one rule reports emitted
occurrences and the other reports semantic source targets.

Do not claim equivalence when one-sided projects or outliers remain unexplained.

## Correctness Requirements

- Pin all revisions and record all filtering policies.
- Preserve raw input and machine-readable results.
- Use scripts only for deterministic extraction and aggregation, not for the
  equivalence decision itself.
- Put temporary investigation scripts under `temp` and delete them afterward.
- Cross-check aggregate totals from independently grouped project results.
- Sample individual diagnostics from every identified cause category.
- Do not use fuzzy or AI-based matching as evidence of exact identity.
- Do not silently discard compile, parse, worker, or JSON failures.

## Migration Note

Create `migration.md` beside the rule fixtures and include:

1. Final migration conclusion.
2. Links or paths to both required reports and their observed source revisions.
3. A row-level reconciliation of both reports.
4. Specific causes for every reported number gap.
5. Project-set comparison over an aligned population.
6. Raw and deduplicated diagnostic totals.
7. Major outliers and their causes.
8. Fixture and real-service evidence.
9. An explicit distinction between functional equivalence and raw count
   equality.

The final statement should say whether the migrated TypeSpec rule is
functionally equal to the related Swagger rule and clearly identify any
remaining uncertainty.
