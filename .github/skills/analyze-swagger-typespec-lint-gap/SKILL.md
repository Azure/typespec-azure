---
name: analyze-swagger-typespec-lint-gap
description: Investigate coverage or diagnostic-count gaps between a Swagger validator rule and its migrated TypeSpec lint rule, determine functional equivalence, and document the evidence. Use when reports disagree, project coverage differs, or Swagger and TypeSpec diagnostic totals do not match.
---

# Analyze Swagger and TypeSpec Lint Gaps

Investigate differences between a Swagger validator rule and its migrated
TypeSpec lint rule without assuming that raw diagnostic counts must be equal.
Produce reproducible evidence, assess coverage, then recommend the smallest
justified action through **Gap analysis and decision**. Analysis does not
authorize production edits; keep report-only tasks report-only.

Follow the shared [analysis-first policy](../shared/analysis-first-lint-migration.md).
Investigate upstream/native code and saved project diagnostics before requesting
new coverage. Form a semantic hypothesis and focused reproducer first; do not
use repeated full runs to discover what to edit. Request fresh real-spec data
when it answers an unresolved question or satisfies the final candidate's gate,
with an explicit cost/budget. Old findings cannot validate changed rule code.

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

Investigate [correspondence](#8-establish-correspondence-and-justify-normalization)
from saved evidence before marking attribution unassessed. Deterministic, tested
attribution is required for claims that use it, not every group observation.
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
   production report only numerically: it was **not evaluated**, not compliant.
   Establish actual execution before using a zero count. ARM/common Spectral
   staging-only rules can use a parent-bound
   [immutable supplement](../analyze-native-lint-coverage/shared-baseline.md#staging-only-diagnostic-supplements)
   over the retained Swagger, with no emission/regeneration. Keep its explicit
   staging profile, runtime and failures separate from production observations.
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

### 8. Establish correspondence and justify normalization

First reconcile the selected Swagger members and each TypeSpec rule's actual
checks/predicates. A shared TypeSpec rule can have multiple diagnostic/message
families: use the family to select the relevant check, then investigate exact
project, API version, operation, model/schema, emitted path and source declaration
identities available in saved diagnostics, receipts and pinned sources. Trace
source-to-emission relationships and predicate behavior, including exceptions.
The same operation, message text, property name or count alone proves neither
the same check nor the same violation.

Attempt deterministic attribution using that existing evidence for singletons,
one-to-many and admitted many-to-one mappings. Account for corresponding findings,
unmatched findings on both sides and unrelated TypeSpec checks. Count shared
warnings once in group totals; do not collapse distinct violations at one location.
General many-to-many remains deferred, not a cross-product of inferred matches.

Add a rule-specific canonical identity only when it is:

- Deterministic.
- Based on the semantic concept enforced by both rules.
- Available for all diagnostics in the intended rule scope.
- Collision-resistant.
- Independently testable with fixtures and sampled real projects.

If evidence cannot establish identity, retain both cardinalities, group
observations and independent member conclusions. Mark only unsupported
attribution/comparison unassessed and name the missing evidence and limits;
never fabricate zero, a match or per-member native counts. Behavioral evidence
can support a scoped semantic conclusion, not an exact-correspondence claim.
Any further compile needs a concrete question and the existing cost/budget gate;
missing attribution is not permission for unlimited runs.

### 9. Gap analysis and decision

Analyze the exact semantic, emission or policy cause before recommending action.
For each investigated gap, record separately in its grouped supporting evidence:

- **Coverage status:** what behavior is covered, missing, compiler-prevented,
  approved for retirement or still unassessed, and for which policy/population.
- **Cause and evidence:** distinguish confirmed Swagger bugs/false positives,
  comparison/population artifacts, existing responsible TypeSpec policies with
  authored suppressions, genuinely missing behavior, modeling/spec issues and
  unresolved/deferred policy. Check existing owning rules before proposing a
  duplicate check.
- **Recommended action and rationale:** weigh coverage benefit against
  implementation complexity, diagnostic noise and maintenance. Recommend the
  smallest justified owning-rule fix, spec/model correction, comparison repair,
  further investigation, non-porting or explicit defer decision. State the
  decision owner/approval still needed; a proposed exclusion is not an approved
  policy retirement.

For a recommended TypeSpec rule change, identify the production source file,
exact missing/extra predicate or target classification, violating fixture and
compliant control. Include relevant version, visibility, reachability and
authorable-shape requirements. Keep those changes separate from emitter,
Swagger linter, report-generator, normalization, dataset or harness work.

Distinguish observed configured warnings from diagnostic/predicate evidence
before suppression and from predicted post-fix gains. An authored suppression
can explain an absent warning without showing a missing owning check; source
inspection alone is not an observed unsuppressed run.

**No immediate code change recommended** does not mean matching semantics.
A deferred genuine gap stays missing and blocks equivalence/success for required
functionality. Do not automatically fix production code to equalize Swagger
totals or port confirmed upstream defects. Do not add a standalone action section
to the reader-facing report; link its evidence-backed decision from the relevant
behavior/difference entry.

### 10. Reach the migration conclusion

Accept the migrated TypeSpec rule as functionally equivalent when:

- Violating and compliant fixtures establish matching semantics.
- The compared populations and API-version scopes are aligned.
- Validator projects' required behavior is covered by the responsible TypeSpec
  checks; total/project overlap alone is not member coverage.
- TypeSpec-only projects are explained or eliminated by correct projection.
- Residual cardinality differences are explained by source-to-emission
  multiplicity, references, generated structures, or identity collisions.
- No investigated outlier demonstrates a missing or extra semantic check.

Raw diagnostic equality is not required when one rule reports emitted
occurrences and the other reports semantic source targets.

Do not claim equivalence when one-sided projects or outliers remain unexplained,
or required functionality is missing/deferred. An approved narrower policy
requires an explicitly scoped conclusion, not full Swagger parity.

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
with a group note linked from the native PR and per-member notes linked from
that group note. Follow the shared
[two-section PR body](../shared/migration-pr-description.md).

This is the shared report contract for migration development, native coverage
analysis and gap investigation. It changes presentation, not the investigation,
validation, review or acceptance requirements.

### Assessment and publication gate

Before publication, reconcile the mapping's membership with the actual owning
rule's source checks at the assessed revision, every member conclusion and all
raw, semantic-check and corresponding-warning count scopes.
Keep each counting unit and attributed subset explicit and traceable; do not
infer missing-member coverage from total agreement or project overlap.

Verify which assessed source revision, helper/compiler/emitter closure and
artifacts support each current-source claim. Comparison-affecting changes to
that source or closure require fresh relevant final coverage under the existing
full-population and budget gates. Report-only changes reuse verified observations.
If a later head contains unrelated changes, retain the frozen assessed identity
and justify applicability; never silently relabel old data as a new-head run.
This publication check does not fetch moving refs mid-run, rerun on every SHA,
refresh the immutable Swagger baseline or waive review/checkpoint/replay gates.

### Reader-facing report

Keep `migration.md` concise and focused on the migration decision. Use
**Swagger linter** and **TypeSpec linter** in reader-facing prose, not
"validator" and "native". Preserve actual package names, source identifiers,
receipt fields, filenames and quoted diagnostics unchanged.

On refresh, first reconcile one underlying assessment, then rewrite the complete
main and member narratives together. Replace superseded tables, classifications
and summaries instead of appending corrections that leave competing conclusions.
Reader-appropriate aggregations may differ while remaining traceable to that
assessment; do not impose one rule's grouping or data constants on other rules.
Preserve all audit, recovery and semantic evidence through direct links, without
repeating provenance/accounting or introducing competing taxonomies.

Use exactly four numbered sections followed by an unnumbered `NOTES` section:

1. **Conclusion and scope.** In a short paragraph, name the TypeSpec rule and
   hyperlink the original Swagger linter rule ID to verified documentation or
   implementation. State clearly whether the migration is functionally
   equivalent for the assessed policy, is not equivalent, or remains
   undetermined. Keep any material gap, failed required gate or scope restriction
   visible here; never manufacture equivalence to fit the format. Keep this
   section limited to the conclusion and policy boundaries, not work performed:
   omit successful test/coverage/recovery milestones, review status, implementation
   PR links, candidate/commit hashes, commands, repair history and redundant
   no-change statements. Put that context in NOTES or linked evidence instead.
   Summarize material non-equivalence or restrictions here; put per-group
   diagnostic counts and their explanations in section 4, not the conclusion.
   If a confirmed Swagger linter bug affects the conclusion, name the bug and its
   impact concisely, and state whether the TypeSpec linter intentionally avoids
   it. Distinguish intended-policy coverage from bug-for-bug equivalence.
2. **Actual coverage.** Briefly state the assessed project population and
   failures/unassessed projects, if any. Explain that reported diagnostics are
   total individual findings across that population, not project counts.
   Use a three-column table: count, Swagger linter, TypeSpec linter. Show raw
   reported totals. When they differ, add a second row only for an explicitly
   justified common unit. Name what it counts and the grouping identity, such
   as "Affected HTTP operations (grouped by project/route)", rather than
   "After analysis". Grouping changes the counting unit; it does not normalize
   findings into equivalent defects or require the remaining counts to match.
   Do not relabel adjusted values as raw findings or imply correspondence from
   equal totals. Mark unsupported comparison/attribution unassessed, and non-lint
   outcomes not applicable, rather than inventing zero or matching counts.
   Keep project overlap and detailed location summaries out of the scorecard.
   Immediately after the table, require an explicit **Assessed coverage**
   summary, not just raw totals or a list of possible causes. State the
   evidence-backed coverage outcome for the assessed policy, supported by
   quantified observations and their scope. Use justified comparable counts
   when available; otherwise report the verified diagnostic categories or
   assessed subsets and explain what their counts establish. Distinguish
   predicate classification from proven semantic disposition: an unequal-schema
   count, for example, is not automatically a false-positive count.
   Keep covered behavior, material missing/deferred behavior and unassessed
   scope visible. If complete correspondence is unsupported, explicitly mark
   comparable violation totals/coverage percentages unassessed and identify
   the missing evidence; do not omit known assessed data or invent adjusted
   totals. If no behavioral assessment is supported, say so and carry that
   limitation into the conclusion and existing acceptance gates.
   Equal totals or zero warnings alone do not establish coverage.
   Briefly explain the evidenced causes of any remaining gap and link first to
   `[Why diagnostic counts differ](#4-why-diagnostic-counts-differ)`, where the
   reader can follow links to detailed evidence. Identify unresolved causes as
   unresolved, not accepted differences. Keep the assessment concise: retain
   detailed member/callback accounting and investigations in section 4 or its
   linked evidence, and exact-reproduction receipts/tracing provenance in NOTES
   or linked evidence. Brief quantified semantic categories needed to interpret
   the assessed outcome belong here. Retain qualifications needed to interpret
   the table; do not turn category counts into matched defects or a coverage rate.
3. **Function-level coverage.** Use a compact three-column table:
   **Behavior**, **Result**, and **Rationale**, covering material checks and
   compliant controls. Keep the result to the coverage status; explain why that
   status applies in the rationale, with a direct link to supporting evidence
   and any material scope limitation. Do not merely repeat the result.
   Distinguish covered, missing,
   compiler-prevented, approved retirement and unassessed behavior honestly.
   Keep test inventories and fixture counts in NOTES or linked evidence.
   Test-case percentages do not establish production prevalence or exhaustive
   rule coverage; do not minimize missing core behavior as a rare corner case.
4. **Why diagnostic counts differ.** Explain only differing projects or
   diagnostic groups: Swagger-linter-only, TypeSpec-linter-only, count-only,
   or semantic/identity differences even when totals match. State each cause,
   both observed counts, coverage status and recommended action/rationale from
   **Gap analysis and decision**, with a direct link to its grouped appendix
   entry. Exclude matching projects and routine examples.
   If there are no differences, say so briefly. Keep unresolved differences
   visible; do not let opposing project gaps cancel.
   When an upstream defect causes a difference, call it a bug, explain its
   mechanism and false-positive/false-negative effect, and link the pinned
   implementation. Distinguish confirmed defects from suspected causes and code
   inspection from captured execution traces; do not imply that a newer upstream
   version or an uncaptured execution path was tested.

   For a difference table, use explicit column names:
   **Difference (with evidence)**, **Swagger diagnostics (raw / grouped)**,
   **TypeSpec diagnostics for the same check**, and
   **Recommended action and rationale**.
   Preserve the compact cell format, such as `53 / 25` and `0`; do not split
   counts into extra columns or repeat labels inside each cell.
   Explain before the table that `raw / grouped` means reported diagnostics /
   justified grouped check instances, and define the grouping identity.
   Grouping must retain distinct checks and meet the correspondence requirements
   above; grouped checks are not necessarily proven service defects.
   Define the TypeSpec column's assessed rule/message scope: it counts observed
   diagnostics attributed to the same check and target/context, not unrelated
   warnings on the same operation or results before suppression.
   Use **unassessed** when attribution is unsupported, not zero. Keep other
   rules' evidence and predicted post-fix gains explicitly separate.
   The action column must distinguish recommendations from approved decisions
   and retain coverage status, unresolved policy and required approval where
   relevant; a vague **Decision** heading must not imply approval.

**NOTES** holds technical context: frozen inputs, audience/API-version and
source/projection policies, severity/default activation, counting method,
directional gaps, test totals and limitations, runtime, provenance and recovery
links, validation/publication status and implementation PR links. An unsupported
comparison, required-check failure or semantic gap still
belongs in the conclusion and relevant behavior/difference entry, not only NOTES.

Do not add a fifth numbered section or a standalone examples/actions section.
Keep code-backed examples, complete investigations, coverage/action decisions,
fixture mappings and reproduction commands in the directly linked appendix.
Removing the standalone example section does not remove any required evidence.

Use this outline, replacing placeholders with verified observations:

```markdown
# <Swagger rule ID> migration

## 1. Conclusion and scope

The TypeSpec rule `<TypeSpec rule ID>` migrates Swagger linter rule
[`<Swagger rule ID>`](<verified original rule documentation or implementation URL>).
**<Evidence-backed equivalence conclusion and assessed scope; name any material confirmed upstream bug concisely.>**

## 2. Actual coverage

<Assessed projects and failures/unassessed projects.>
Reported diagnostics means individual findings, not projects.

| Count                                         | Swagger linter        | TypeSpec linter       |
| --------------------------------------------- | --------------------- | --------------------- |
| Reported diagnostics                          | <raw total>           | <raw total>           |
| <Justified common unit and grouping identity> | <count or unassessed> | <count or unassessed> |

**Assessed coverage:** <Evidence-backed coverage outcome and policy, supported by
quantified comparable findings or verified categories/subsets with their scope.
State what those data establish, material missing/deferred behavior and what
remains unassessed; raw totals alone are not the assessment.>

<If complete correspondence is unsupported, identify the missing evidence and
mark comparable violation totals/coverage percentages unassessed. Do not discard
known assessed subsets or invent adjusted counts. Briefly explain remaining
evidenced causes and explicitly unresolved causes.>
See [Why diagnostic counts differ](#4-why-diagnostic-counts-differ) for the breakdown and remaining limitations.

## 3. Function-level coverage

| Behavior                               | Result            | Rationale                                                              |
| -------------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| <Material check and compliant control> | <Verified status> | <Why this status applies, with evidence link and any scope limitation> |

## 4. Why diagnostic counts differ

<Define any grouping identity and the assessed TypeSpec rule/message scope.
Include differing projects/diagnostic groups only; if none, say so instead of
adding a table.>

| Difference (with evidence)        | Swagger diagnostics (raw / grouped)         | TypeSpec diagnostics for the same check | Recommended action and rationale                                      |
| --------------------------------- | ------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| <Cause and grouped-evidence link> | <Raw count> / <Grouped count or unassessed> | <Observed count or unassessed>          | <Coverage status; recommendation, rationale and any pending approval> |

<Keep compact numeric cells. If grouping is not needed, use "Swagger diagnostics"
and a single raw count. Keep other rules' evidence and predicted post-fix gains
separate from observed attributed diagnostics.>

## NOTES

<Technical context, validation limits and links to supporting evidence/recovery.>
```

Omit the common-unit row when raw counts agree. When counts differ but no
supported common unit exists, retain the raw counts and mark comparison
unassessed; do not invent normalization.

Before publishing or refreshing, read the entire main report, all member notes
and linked grouped conclusions together, not just sections 1 and 2. Can the
reader readily decide: Is migration complete, and for which policy? What do the
numbers count? Why do they differ? What should change, and why is it worth the
complexity? What remains uncertain? Verify section 2 includes an evidence-backed
assessed outcome and scoped quantitative data, not only raw totals or general
causes; unsupported assessment must be explicitly unassessed. Check that scorecards, behavior tables,
decisions and limitations answer consistently, with matching controls separate
from differences and technical proofs directly linked. Quality is the reader's
decision, not word count or outline compliance. Remove stale summaries and
repeated accounting/provenance without discarding evidence or hiding gaps.

For many-to-one tasks, name and link every original Swagger linter in the short
conclusion. Put the member status matrix in NOTES or directly linked member
evidence; keep combined raw/comparable counts in the scorecard. Retain every
member's semantic evidence and unresolved result. Do not invent per-member
TypeSpec counts when attribution is unavailable. Use the same outline for member
notes without duplicating shared baseline data.

### Grouped supporting differences

Start the appendix's difference analysis with a linked summary of only projects
or diagnostic groups that differ. For each, show reported Swagger/TypeSpec
counts, justified after-analysis counts or unassessed status, cause, coverage
status and recommended action/rationale. Group details by project, then exact
diagnostic target such as path/method, schema or source declaration. Show both linters' counts per group
so reviewers can account for the entire project difference without reading raw
JSON. Reconstructable shared prefixes can shorten long paths without losing
case, parameter names or identity.

For example, distinguish a path finding covering several HTTP methods from
repeated findings on the same referenced path. Keep repeat/input attribution
limits explicit. Do not infer identity merely from matching names or totals.
Account for every differing group and both directions, including unexplained
residuals. Retain signed/absolute/relative gaps, the complete population and
matching controls separately; matching controls are not difference groups.
Required representative source/schema examples remain under the relevant
group, with direct links from the report. Approved narrower policies need
explicit approval and a scoped conclusion, not an unsupported full-parity claim.

### Supporting evidence and completeness

Keep all of the following in the concise report or its directly linked supporting
evidence. Moving details must not discard evidence, weaken a gate or turn an
unresolved investigation into an accepted difference:

1. Final migration conclusion.
2. Separate coverage status, exact cause and recommended action/rationale under
   **Gap analysis and decision**, including deferred gaps and pending approvals.
3. Concrete TypeSpec source/fixture/compliance-control requirements for recommended
   changes, or the justified non-code decision and any further investigation.
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

In the grouped appendix, include at least one representative example for every
distinct material cause of a Swagger-linter-only, TypeSpec-linter-only, or
diagnostic-count gap. Do not rely on aggregate counts or a project list alone.
Use this structure so a reviewer can understand the difference without
reconstructing the investigation:

```md
### Gap example: <short cause>

- **Classification:** <Swagger-linter-only | TypeSpec-linter-only | count-only>
- **Status:** <fixed | approved policy difference | population mismatch | deferred | unresolved>
- **Project/API version:** `<project>` / `<version>`
- **Source:** `<path or symbol>`

**TypeSpec source**

\`\`\`typespec
<smallest relevant authored TypeSpec excerpt>
\`\`\`

**Emitted OpenAPI or Swagger linter behavior**

\`\`\`json
<smallest relevant emitted schema excerpt>
\`\`\`

| Engine          | Observed result                            |
| --------------- | ------------------------------------------ |
| Swagger linter  | <diagnostic or no diagnostic, with reason> |
| TypeSpec linter | <diagnostic or no diagnostic, with reason> |

**Explanation:** <the exact semantic, emission, projection, or Swagger linter
implementation difference that causes the gap>.

**Coverage status:** <evidenced behavior and policy boundary>.

**Recommended action and rationale:** <smallest justified fix or explicit
non-porting/defer/investigation decision; benefit versus complexity/noise/maintenance>.
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

The final statement should state functional equivalence for the assessed policy,
any approved scope restriction and remaining uncertainty.
