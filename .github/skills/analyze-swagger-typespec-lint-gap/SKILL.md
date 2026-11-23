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

Keep the original configured totals in machine-readable evidence. For the
reader-facing comparison, count individual diagnostics within the original
Swagger rules' assessed policy and population, including corresponding captured
suppressed diagnostics. Filter a mixed TypeSpec rule by its actual checks, not
its rule ID alone. Preserve the inclusion/exclusion ledger and distinguish this
scoped observed total from the unfiltered configured total. Do not exclude an
in-scope TypeSpec-only finding merely because Swagger did not report it.

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
- **Analysis and proposed action:** weigh coverage benefit against
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

### 10. Assess the migration evidence

Evidence supporting functional equivalence requires:

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
Keep that semantic assessment in linked supporting evidence. The reader-facing
report presents observations, missing behavior and proposed actions without a
blanket migration verdict or a claim that the proposed action is approved.
Reviewers retain the acceptance and policy decisions.

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
[PR body contract](../shared/migration-pr-description.md).

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

Keep `migration.md` concise and focused on reviewer-facing analysis. Use
**Swagger linter** and **TypeSpec linter** in reader-facing prose, not
"validator" and "native". Preserve actual package names, source identifiers,
receipt fields, filenames and quoted diagnostics unchanged.

On an assessment refresh, first reconcile one underlying assessment, then
rewrite the complete main report and all member notes together for human readers. Treat the whole
document as editable, not as an original narrative to preserve with appended
updates. Rework all four sections and NOTES into a single current explanation;
do not only add corrections, patch newly changed findings or replace a few
counts. Replace superseded tables, classifications and summaries, and remove
stale or duplicated prose so readers do not have to reconcile old and new
conclusions.
Reader-appropriate aggregations may differ while remaining traceable to that
assessment; do not impose one rule's grouping or data constants on other rules.
Preserve all audit, recovery and semantic evidence through direct links, without
repeating provenance/accounting or introducing competing taxonomies.
An editorial-only cleanup may retain unchanged sections after verifying that
their counts, scopes and linked evidence remain consistent.

Use exactly four numbered sections followed by an unnumbered `NOTES` section:

1. **Scope.** Name the TypeSpec linter and hyperlink every original Swagger
   linter ID to verified documentation or implementation. Add the original
   migration linter PR link when one exists. Include only that mapping and PR
   link: no equivalence verdict, validation history, counts or proposed actions.
2. **Coverage.** State the assessed project population and any failed or
   unassessed projects. Use a three-column table: **Count**, **Swagger linter**,
   **TypeSpec linter**, containing only **Reported diagnostics**. These are
   individual diagnostic occurrences within the stated comparison scope, not
   projects, routes, grouped checks or equivalent defects. Do not add a grouped
   count row or silently substitute normalized values.

   Include captured suppressed diagnostics attributed to the original Swagger
   checks, whether emitted by the selected rule or an existing owning rule.
   Count each distinct diagnostic once across members; do not collapse different
   diagnostics for the same check. Source inspection or predicted findings are
   not captured diagnostics. State the configured, excluded and suppressed
   components and preserve their identities in linked evidence. If suppression
   inspection covers only an affected subset, label the total as observed in
   that subset; never claim an exhaustive suppression-inclusive corpus count.

   For a mixed TypeSpec rule, exclude checks outside the original rules' assessed
   policy or population, not all unmatched warnings. Retain in-scope
   TypeSpec-only findings and investigate them. Missing attribution is
   **unassessed**, not evidence that a finding is out of scope or compliant.
   Keep unfiltered totals and exclusion reasons in the appendix.

   Follow the table with a brief **Analysis:** describing the quantified
   observed coverage, material missing/deferred behavior and limitations,
   without declaring migration acceptance. If grouped check contexts are used,
   define their identity and distinguish them from diagnostic counts. A context
   with no TypeSpec diagnostic may be a false positive, policy difference or
   missing check; do not label all such contexts implementation gaps.
   Unsupported comparable-defect totals and coverage percentages stay
   unassessed. Link to
   `[Why diagnostic counts differ](#3-why-diagnostic-counts-differ)`.

3. **Why diagnostic counts differ.** Explain differing projects or diagnostic
   groups, including count-only differences for already-diagnosed behavior.
   Use **Difference (with evidence)**, **Swagger diagnostics (raw / grouped)**,
   **TypeSpec diagnostics for the same check**, and **analysis** as table
   headings. Use **Swagger diagnostics** instead when no grouping is needed.
   Define any grouping identity and keep compact cells such as `53 / 25`.
   Grouping retains distinct checks and does not establish equivalent defects.
   Both linters' columns must use the section 2 inclusion and suppression policy;
   never show zero solely because a captured finding was suppressed.

   State the evidenced cause, coverage status and proposed action with a direct
   link to its grouped appendix entry. Distinguish confirmed bugs, suspected
   causes, code inspection and captured execution. Preserve unresolved causes,
   pending approvals and required gates. Present analysis and proposals, not
   claims that an action is inherently rational or an approved decision.
   Keep excluded mixed-rule diagnostics out of the difference table and totals;
   retain their audit trail in linked supporting evidence.

   Make the entire raw-count difference calculable from this section. Show a
   signed reconciliation of **Swagger total - TypeSpec total**, including
   source/emission multiplicity, several member checks sharing one diagnostic,
   and distinct owning diagnostics overlapping the same check. A concise
   count-only explanation may replace a table row for already-diagnosed
   behavior, but its contribution to the gap must remain explicit. Do not
   confuse suppressed findings with missing coverage or hide a count difference
   merely because the behavior is covered. Retain opposing project differences
   in linked evidence; their cancellation does not establish correspondence.
   If a residual cannot be explained, quantify it as unresolved rather than
   inventing a balancing category. Matching controls belong in supporting
   evidence, not routine difference rows.

4. **Function-level coverage.** Use **Behavior**, **Result**, and **analysis**
   to show material checks and compliant controls. The result states the
   evidence-backed coverage status; the analysis explains it with direct
   supporting links and scope limits. Distinguish covered, missing,
   compiler-prevented, approved retirement and unassessed behavior.
   Keep pending policy decisions and core gaps visible. Test-case percentages
   do not establish production prevalence or exhaustive rule coverage.

**NOTES** is a short reference, not a second assessment or a change log.
Keep only:

- Assessed source/specs/closure identities, material API-version or execution
  limits, and whether this is a report-only reuse rather than a new run.
- Counting or suppression limitations not already explained in sections 2 and
  3, with direct links to the original configured observations, scoped accounting,
  exclusion ledger and per-member evidence.
- Validation status at the assessed revision, especially failed or unrun
  required checks; link the detailed test inventory, recovery and CI receipts.
- Verified follow-up PRs and their relevance, clearly separated from frozen
  counts and from validated outcomes.

Prefer a few compact labeled bullets. Move member matrices, repeated
definitions/arithmetic, test inventories, runtime details and repair chronology
to existing linked evidence. Preserve any information not already present there
before removing it from NOTES. Label historical CI results by the assessed
revision; do not present them as current PR status. Do not carry forward stale
counts, superseded conclusions or repeated disclaimers. Material coverage
limits and semantic gaps remain visible in sections 2-4, not only NOTES.

Do not add a fifth numbered section or a standalone examples/actions section.
Keep code-backed examples, complete investigations, coverage/action decisions,
fixture mappings and reproduction commands in the directly linked appendix.
Removing the standalone example section does not remove any required evidence.

Use this outline, replacing placeholders with verified observations:

```markdown
# <Swagger rule ID> migration

## 1. Scope

The TypeSpec linter `<TypeSpec rule ID>` is assessed against Swagger linter rule
[`<Swagger rule ID>`](<verified original rule documentation or implementation URL>).
Original migration linter PR: [<owner/repo#number>](<verified PR URL>).

## 2. Coverage

<Assessed projects and failures/unassessed projects.>
Reported diagnostics are individual findings for the original Swagger checks,
including corresponding captured suppressed findings. State exclusions and
whether suppression capture is exhaustive or limited to an inspected subset.

| Count                | Swagger linter     | TypeSpec linter    |
| -------------------- | ------------------ | ------------------ |
| Reported diagnostics | <scoped raw total> | <scoped raw total> |

**Analysis:** <Quantified observed behavior, missing/deferred checks and
unassessed scope. Define any check-context counts; do not declare acceptance
or infer an equivalent-defect coverage percentage from raw totals.>

See [Why diagnostic counts differ](#3-why-diagnostic-counts-differ).

## 3. Why diagnostic counts differ

<Define any grouping identity and the assessed TypeSpec rule/message scope.
Use the same diagnostic inclusion/suppression policy as section 2.>

| Difference (with evidence)        | Swagger diagnostics (raw / grouped)         | TypeSpec diagnostics for the same check | analysis                                                          |
| --------------------------------- | ------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| <Cause and grouped-evidence link> | <Raw count> / <Grouped count or unassessed> | <Observed count or unassessed>          | <Evidence, coverage status, proposed action and pending approval> |

**Raw-count reconciliation:** <Swagger total> - <TypeSpec total> =
<signed sum of all difference contributions, including count-only differences>.
<Link the corresponding evidence; quantify any unexplained residual.>

## 4. Function-level coverage

| Behavior                               | Result            | analysis                                                   |
| -------------------------------------- | ----------------- | ---------------------------------------------------------- |
| <Material check and compliant control> | <Verified status> | <Evidence, scope limits and proposed action if applicable> |

## NOTES

- **Inputs:** <Assessed identities, execution/version limits and provenance link.>
- **Counting evidence:** <Only necessary limits and direct accounting/member links.>
- **Validation:** <Assessed results, failed/unrun checks and detailed receipt link.>
- **Follow-ups:** <Separate verified PR links; not credited without evidence.>
```

Omit inapplicable placeholders and PR links rather than guessing them. Do not
add a grouped/common-unit row to the coverage scorecard. When exact comparable
counts or attribution are unsupported, mark that comparison unassessed and
retain the known scoped observations; do not invent normalization.

Before publishing or refreshing, read the entire main report, all member notes
and linked grouped conclusions together, not just sections 1 and 2. Can the
reviewer determine the supported policy and remaining gaps, what the numbers
count, how the complete gap reconciles, and which actions still need approval?
Verify the scorecard filters, suppressed callbacks, excluded checks and signed
reconciliation against the same underlying assessment. Keep known observed data
and limitations visible without a blanket verdict. Check that behavior tables,
proposals and linked evidence use consistent scopes. Remove repeated
accounting/provenance without discarding evidence or hiding failed gates.

For many-to-one tasks, name and link every original Swagger linter in Scope.
Put the member status matrix in directly linked member evidence, not NOTES;
keep combined scoped raw counts in the scorecard. Retain every
member's semantic evidence and unresolved result. Do not invent per-member
TypeSpec counts when attribution is unavailable. Use the same outline for member
notes without duplicating shared baseline data.

### Grouped supporting differences

Start the appendix's difference analysis with a linked summary of only projects
or diagnostic groups that differ. For each, show reported Swagger/TypeSpec
counts, justified after-analysis counts or unassessed status, cause, coverage
status and analysis/proposed action. Group details by project, then exact
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

1. Evidence-backed semantic assessment and unresolved reviewer decisions.
2. Separate coverage status, exact cause and analysis/proposed action under
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

**analysis:** <evidenced cause and proposed fix, non-porting, defer or
investigation action; tradeoffs, limitations and required approval>.
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

Close the supporting assessment with the evidenced semantic coverage, approved
scope restrictions, missing behavior and remaining uncertainty. Leave migration
acceptance and unapproved policy decisions to reviewers.
