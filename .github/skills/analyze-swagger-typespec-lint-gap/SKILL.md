---
name: analyze-swagger-typespec-lint-gap
description: Investigate coverage or diagnostic-count gaps between a Swagger validator rule and its migrated TypeSpec lint rule, determine functional equivalence, and document the evidence. Use when reports disagree, project coverage differs, or Swagger and TypeSpec diagnostic totals do not match.
---

# Analyze Swagger and TypeSpec Lint Gaps

Investigate differences between a Swagger validator rule and its migrated
TypeSpec lint rule without assuming that raw diagnostic counts must be equal.
Produce reproducible evidence, decide whether the migrated TypeSpec rule needs
to change, and give a rule-focused implementation plan when it does.

For official-package runs, prefer the immutable baseline and candidate receipts
from [/analyze-native-lint-coverage](../analyze-native-lint-coverage/SKILL.md).
For explicit many-to-one tasks, apply the
[combined-count policy](../do-linter-development-task-one-by-one/native-first.md#counts-completeness-and-correspondence):
comparable diagnostic counts per project are primary; project sets remain
population/regression guards and per-member tests prove completeness. Preserve
raw counts and justified normalization, directional excesses and absolute/relative
differences. Equal corpus totals must not cancel opposite project gaps.
Investigate every residual; "close" is not permission to ignore a missing member.
Never deduplicate distinct violations merely because paths/locations match.

Require deterministic attribution only for claims that use it, such as per-member
native counts or exact correspondence. Without it, report group observations
and independent member conclusions, marking member native counts unassessed.
Do not add artificial Swagger identities to production messages. Missing
attribution alone is a reporting limit; unresolved required semantic/count
questions or execution failures still block the relevant conclusion.

## Inputs

Collect or identify:

- Swagger validator rule ID.
- Mapped TypeSpec lint rule ID.
- Spec repo or lint-diff worktree.
- For native runs: completed baseline identity, actual specs/closure, candidate
  source/artifacts, comparison profile and successful/failed project inventory.
- For groups: explicit frozen membership and per-member semantic controls.
- When investigating historical report disagreement, the local snapshot:
  `packages/typespec-lintdiff/docs/coverage_old.md`.
- The historical lint-diff observed coverage report, when relevant:
  `packages/typespec-lintdiff/specs/coverage-breakdown.md`.
- Source revision, generation time, and generator revision for both reports.
- Validator and TypeSpec per-project diagnostic files.
- Rule fixtures, including violating and compliant cases.

If a report provides only aggregate counts, explicitly record that individual
unmatched projects cannot be reconstructed from it.

## Workflow

### 1. Reconcile the two coverage reports

When historical coverage reports underpin the disputed claim, examine both
before investigating an individual rule. Native baseline comparisons do not
require reproducing unrelated old reports; record them as not applicable. Do not
compare their category totals or coverage percentages as if they used the same
definition.

The external gist and the lint-diff report answer different questions:

| Dimension         | External gist                                                                                               | Lint-diff `coverage-breakdown.md`                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Primary question  | Is there some migration disposition or coverage, including official rules and structurally prevented cases? | Did mapped TypeSpec diagnostics occur in the same successfully compiled projects as validator diagnostics? |
| Coverage credit   | Local lint, official mapping, blocked/infallible classification, and some never-fired mappings              | Observed same-project diagnostic overlap only; mapping alone receives no credit                            |
| Main columns      | `Fired`, `Lint`, `Official`, `Pct`                                                                          | `Fired`, `TSP Fired`, `Lint/Overlap`, `Gap`, `TSP Only`, raw diagnostic totals                             |
| Rule modes        | May combine or omit execution-policy distinctions                                                           | Separates normal `production` validation from explicitly evaluated `stagingOnly` rules                     |
| Diagnostic detail | Primarily aggregate project coverage                                                                        | Project sets plus raw validator and TypeSpec diagnostic cardinality                                        |

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

### 3. Establish project-set guardrails

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
compliant control. Run the owning native package's tests and injected-package
controls for official runs. For legacy fixture runs, use the repository's
validation command and `audit:noise` to find incidental or unmapped diagnostics.

`audit:noise` is supporting evidence only. It does not establish target
identity, prove compliant behavior, or replace real-service analysis.

### 5. Analyze raw diagnostic cardinality

Record raw validator and TypeSpec diagnostic totals, but do not use their
equality alone as the migration criterion. For groups, combined comparable
counts per project are the primary numerical signal. Define and justify the
comparison unit, then investigate directional and absolute/relative gaps.

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

- Validator occurrence key: validator ID + project + Swagger file + JSON path.
- Validator file-independent key: validator ID + project + JSON path.
- TypeSpec source key: native rule ID + project + source file + line + column.

These are conservative location summaries, not proof of actionable identity.
Retain raw occurrences, including multiple distinct checks at the same key.
Cross-validator overlap requires explicit semantic evidence; do not drop a rule
ID and deduplicate the group by JSON path. Likewise distinct native violations
can share a source location. Only independently tested claim-specific
normalization can establish comparable counts.

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

If no reliable semantic identity exists across the two outputs, preserve the
two cardinalities and judge equivalence behaviorally.

### 9. Decide whether the TypeSpec rule must change

This is the primary decision produced by the investigation.

Update the migrated TypeSpec rule when aligned evidence shows that it:

- Misses an authorable API shape diagnosed by Swagger.
- Reports an authorable compliant shape rejected by neither Swagger nor the
  rule specification.
- Checks a broader or narrower semantic target than Swagger.
- Uses the wrong path, operation, version, visibility, or reachability
  classification.
- Cannot observe a Swagger-enforced concept that is represented in the
  TypeSpec semantic program.

Do not request a TypeSpec rule change when the gap is fully caused by report
population, API-version projection, compile failures, duplicated emitted
occurrences, stale validator data, or another non-rule comparison artifact.

For every investigated gap, state exactly one of:

- **TypeSpec rule update required:** identify the missing or extra semantic
  behavior, the production rule file to change, and the violating and compliant
  fixtures to add.
- **No TypeSpec rule update required:** identify the evidence proving the
  migrated rule already has matching behavior.

The **Required changes** section must contain only production TypeSpec rule and
directly related fixture/test changes. Do not include emitter, validator,
report-generator, normalization, dataset, or harness work in that section.
Those causes may be mentioned briefly as explanations for excluded report
differences, but they are not migration-rule action items.

### 10. Reach the migration conclusion

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

For legacy work create `migration.md` beside the rule fixtures. Native-first
work uses the verified fork [evidence layout](../do-linter-development-task-one-by-one/evidence.md),
with a group note and per-member notes linked from the native PR.

This is the shared report contract for migration development, native coverage
analysis and gap investigation. It changes presentation, not the investigation,
validation, review or acceptance requirements.

### Reader-facing report

Keep `migration.md` concise, normally about one or two pages (roughly 600-900
words). This is a readability target, not permission to omit required findings.
Put long investigations, provenance, repair history, complete inventories and
reproduction commands in a linked `evidence-details.md` or existing appendix.
Use these five sections in order:

1. **Conclusion and scope.** Lead with the supported behavior and practical
   migration value when evidence establishes them. State remaining gaps, the
   rule-change decision and material uncertainty alongside those positives.
   Distinguish standard-case agreement from full functional parity; do not
   declare the whole migration unsuccessful merely because representation
   corner cases remain. Do not invent success, soften a required-check failure,
   or claim equivalence despite a demonstrated semantic gap. Name the compared
   audience, API-version policy and analysis/default activation distinction;
   link the frozen inputs rather than opening with hashes or commands.
2. **Actual coverage.** Put the key numbers in a compact scorecard: selected,
   assessed and failed/unassessed projects; raw Swagger and raw/aligned native
   findings; affected-project overlap; and one-sided projects. Identify the
   counting units and comparison scope. Project overlap and ratios between
   different diagnostic identities are not functional coverage. Mark exact
   diagnostic correspondence unassessed when it is not established. Link the
   full report and per-project audit.
3. **Function-level coverage.** Show supported core behavior and compliant
   controls before the targeted gap inventory. Define the audited behaviors,
   denominator, observed counts and status for each row: covered, missing,
   compiler-prevented, approved retirement or unassessed. Distinguish ordinary
   authoring surfaces from representation corner cases when justified; never
   label a missing core function a corner case to minimize it. A deliberately
   edge-heavy fixture suite is a stress test, not an estimate of production
   coverage. Explain that equally weighted case percentages do not measure
   real-spec prevalence or exhaustive rule-wide coverage. "Corner case" describes
   the shape, not proven rarity; state frequency limits and real-spec witnesses.
   Label test-case counts separately from behavior coverage.
4. **Why diagnostic counts differ.** Use a small cause/observation/disposition
   table with links to exact examples. Preserve both directional excesses and
   unexplained residuals; do not let opposite project gaps cancel. Separate
   multiplicity, reference boundaries, version/population alignment and true
   semantic misses. Call findings obsolete only with target-specific
   version/removal evidence. Label deliberate policy retirements separately
   and record their explicit approval.
   A native non-finding alone is not evidence that a legacy check is outdated.
5. **Examples and required action.** Show a small working core example when
   supported, plus representative material gaps, preferably from real services.
   Include minimal TypeSpec, emitted schema or validator behavior, and each
   engine's observed result so the difference is immediately clear. Keep only
   a few examples inline; link every other material cause or audited corner
   case directly to a short, named source/schema example, not just the appendix
   title or a large JSON dump. Keep production rule/test actions separate from
   comparison-tool fixes. State the production changes needed for full parity,
   or why none are required. An approved narrower policy supports a scoped
   outcome, not full parity. Link reproduction/source-retention receipts and
   distinguish verified replay from untested regeneration.

For many-to-one tasks, retain the member status matrix in the conclusion,
combined raw/comparable counts in the scorecard, and per-member semantic
evidence in the function table or directly linked member notes. Do not invent
per-member native counts when attribution is unavailable. Use the same outline
for member notes without duplicating shared baseline data.

### Supporting evidence and completeness

Keep all of the following in the concise report or its directly linked supporting
evidence. Moving details must not discard evidence, weaken a gate or turn an
unresolved investigation into an accepted difference:

1. Final migration conclusion.
2. A direct answer to whether the migrated TypeSpec rule must change.
3. Required TypeSpec rule and fixture/test changes, or an explicit statement
   that none are required.
4. Links or paths to both required reports and their observed source revisions.
5. A row-level reconciliation of both reports.
6. Specific causes for every reported number gap.
7. Project-set comparison over an aligned population.
8. Raw and deduplicated diagnostic totals.
9. Major outliers and their causes.
10. Fixture and real-service evidence.
11. An explicit distinction between functional equivalence and raw count
    equality.

### Code-backed gap examples

For every distinct material cause of a validator-only, TypeSpec-only, or
diagnostic-count gap, include at least one representative example. Do not rely
on aggregate counts or a project list alone. Use this structure so a reviewer
can understand the difference without reconstructing the investigation:

```md
### Gap example: <short cause>

- **Classification:** <validator-only | TypeSpec-only | count-only>
- **Status:** <fixed | intentional | population mismatch | unresolved>
- **Project/API version:** `<project>` / `<version>`
- **Source:** `<path or symbol>`

**TypeSpec source**

\`\`\`typespec
<smallest relevant authored TypeSpec excerpt>
\`\`\`

**Emitted OpenAPI or validator behavior**

\`\`\`json
<smallest relevant emitted schema excerpt>
\`\`\`

| Engine            | Observed result                            |
| ----------------- | ------------------------------------------ |
| Swagger validator | <diagnostic or no diagnostic, with reason> |
| TypeSpec lint     | <diagnostic or no diagnostic, with reason> |

**Explanation:** <the exact semantic, emission, projection, or validator
implementation difference that causes the gap>.

**Disposition:** <rule fix, comparison projection, intentional extra coverage,
or remaining investigation>.
```

Use excerpts verified against the pinned source and generated output; do not
invent illustrative code. Keep each excerpt to the smallest shape that proves
the cause, and name the relevant property, operation, JSON path, or diagnostic
target. When the gap is caused only by population or API-version selection and
there is no meaningful emitted schema excerpt, replace that block with the
smallest versioning, projection, or report-metadata excerpt that proves the
exclusion and explain why no Swagger comparison exists.

One example may cover multiple projects only when evidence shows they share the
same cause. Separate examples are required for different causes. Resolved gaps
must retain an example when it explains why production or comparison behavior
changed; mark the status and disposition accordingly.

The final statement should say whether the migrated TypeSpec rule is
functionally equal to the related Swagger rule and clearly identify any
remaining uncertainty.
