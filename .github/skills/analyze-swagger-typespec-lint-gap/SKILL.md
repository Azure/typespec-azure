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
- Reports being compared and their source revisions.
- Validator and TypeSpec per-project diagnostic files.
- Rule fixtures, including violating and compliant cases.

If a report provides only aggregate counts, explicitly record that individual
unmatched projects cannot be reconstructed from it.

## Workflow

### 1. Establish comparable populations

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

### 2. Compare project sets first

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

### 3. Verify rule semantics with fixtures

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

### 4. Analyze raw diagnostic cardinality

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

### 5. Apply conservative deduplication

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

### 6. Investigate outliers

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

### 7. Decide whether stronger normalization is valid

Add a rule-specific canonical identity only when it is:

- Deterministic.
- Based on the semantic concept enforced by both rules.
- Available for all diagnostics in the intended rule scope.
- Collision-resistant.
- Independently testable with fixtures and sampled real projects.

When possible, prefer emitter source maps or instrumentation that maps an
emitted Swagger node to its originating TypeSpec target. If no reliable mapping
exists, preserve the two cardinalities and judge equivalence behaviorally.

### 8. Reach the migration conclusion

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
2. Methodological differences between the reports.
3. Project-set comparison.
4. Raw and deduplicated diagnostic totals.
5. Major outliers and their causes.
6. Fixture and real-service evidence.
7. An explicit distinction between functional equivalence and raw count
   equality.

The final statement should say whether the migrated TypeSpec rule is
functionally equal to the related Swagger rule and clearly identify any
remaining uncertainty.
