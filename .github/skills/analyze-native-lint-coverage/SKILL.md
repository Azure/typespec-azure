---
name: analyze-native-lint-coverage
description: Run merged or unmerged official TypeSpec Azure lints against real specs using a pinned shared Swagger baseline first. Compare one-to-one, one-to-many or explicit many-to-one mappings without regenerating Swagger. Preserve member evidence and diagnostic counts; defer general many-to-many.
argument-hint: "[PR URL or native rule] [Swagger validator IDs] [optional baseline run or specs filter]"
user-invocable: true
---

# Analyze native lint coverage

Use this skill to test an official-library implementation without first copying
it into `tsp-lintdiff-local-linter`. Merged and unmerged implementations use the
same artifact-injection and comparison path. This is an analysis workflow, not
authorization to modify the rule, enable it by default, or rewrite the migration
queue.

## Cost-aware invocation

Read the shared [analysis-first policy](../shared/analysis-first-lint-migration.md)
before execution. Prefer source/semantic analysis, saved observations and focused
regressions while editing a rule. Full native verification is expensive even
when Swagger data is reused; do not invoke it automatically after each edit.
Record the question or required final gate, estimate and budget before starting.
Retain required fresh final coverage and every evidence/control gate below.

## Inputs and contract

Resolve the candidate PR or branch, canonical repository, official native rule
IDs, original validator ID(s), and intended audience. Inspect the actual source,
tests, registration, and authored rule documentation. PR descriptions can retain
old rule names; verify the final `createRule({ name })` and linter registration.

For the initial pilot, PR
[#5265](https://github.com/Azure/typespec-azure/pull/5265) maps
`EnumInsteadOfBoolean` to `@azure-tools/typespec-azure-core/no-boolean`.
Treat equivalence as a hypothesis to test, not an expected result to manufacture.

Apply the [validator audience contract](../lintdiff-rule-intake/SKILL.md#validator-audience-contract).
The current generator evaluates production ARM Swagger validation. Data-plane,
RPaaS, staging-only, and SDK-name policies need separately established comparison
profiles; do not present an ARM run as proof for those audiences.

## Mapping scope

Use an explicit mapping per analyzer invocation. Record validator IDs, native IDs,
semantic checks supplied by each native rule, audience, rule options, alignment
profile, and supporting violating/compliant tests in the migration evidence.
This is a reviewable mapping record, not a new CLI manifest format. Groups need
the queue's [per-member intake and admission](../do-linter-development-task-one-by-one/native-first.md#input-and-group-admission)
even when this skill runs independently.

| Mapping                                    | Procedure                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One Swagger rule to one TypeSpec rule      | Pass one `--validator-rule` and one `--tsp-rule`.                                                                                                                         |
| One Swagger rule to several TypeSpec rules | Repeat `--tsp-rule` for the rules that collectively implement the validator's checks. Preserve each rule's diagnostic identity and investigate its contribution.          |
| Several Swagger rules to one TypeSpec rule | Repeat `--validator-rule` and pass exactly one `--tsp-rule`. Run native once and retain each Swagger member's observations, semantic tests and conclusion.                |
| General many-to-many                       | Defer group-level analysis and equivalence. Record the mapping and limitation; do not infer a cross-product of rule pairs or collapse the group into one coverage result. |

Repeated distinct `--validator-rule` values are supported; duplicate IDs and
multiple validators combined with multiple native rules are rejected. Do not
invent a mapping-file CLI option. Separate historical member comparisons remain
scoped evidence; do not add their shared native counts together.

For an evidenced template/library outcome without a registered native lint,
use the [native-package evidence lane](package-evidence.md) instead of inventing
a mapping. Its explicit `--native-package` selector retains artifact injection,
full-population source/Swagger observations and the existing acceptance gates.
Native finding counts and comparison metrics are not applicable, not zero or
equivalent. Successful compilation alone does not prove native enforcement.

For many-to-one comparisons, a shared native rule can report checks unrelated
to the selected Swagger rule. Matching project sets can therefore hide a missing
check. Verify each validator's material checks with discriminating violating and
compliant fixtures, inspect the relevant native findings, and explain broader
native behavior. Do not attribute findings by message text or property names.
When reliable attribution is unavailable, report group counts, observed project
sets and independent member conclusions. Per-member native counts remain
unassessed, not zero. Attribution limits alone are not missing production checks;
unanswered required semantics or unexplained count gaps still block a conclusion.

Related comparisons may use different options or alignment profiles only when
those differences are explicit. Do not compare their totals as if they shared
the same execution policy. In particular, `boolean-http` supports only the
single Azure Core `no-boolean` rule, not a list of native rules.

Keep each validator's population, failures, raw counts and conclusion separate.
Do not call a shared native rule's full project set that member's coverage
without attribution. Different validator IDs at the same JSON path remain
distinct observations; location coincidence does not establish semantic overlap.
The tool sums raw member occurrences and counts native diagnostics once. It does
not automatically normalize cross-validator overlap or actionable units.

## Shared baseline first, immutable run

Follow the [monthly evaluation snapshot](shared-baseline.md#monthly-evaluation-snapshot):
reuse one frozen specs commit across the dependency-upgrade cycle while new
native branches start from current canonical main. Assume current-main compiler
and libraries remain backward-compatible with the frozen specs, and explicitly
select the supported `--baseline-policy frozen-reference`. Reuse saved Swagger
diagnostics and rerun native diagnostics across the full frozen corpus.
Investigate actual failures and gaps; different runtime versions alone do not
require refresh or prove incompatibility.

1. Record the caller's current branch before any checkout. Do not change its
   base merely because the candidate targets `main`.
2. Discover and pin the shared descriptor **before** choosing specs or installing
   dependencies. Follow [shared-baseline.md](shared-baseline.md): fetch the metadata
   branch, record its exact commit, and read the descriptor at that commit.
   Resolve its immutable version descriptor, archive and frozen `source.commit`.
   Missing, corrupt, unavailable or incompatible data blocks migration with the
   exact prerequisite; never silently run the Swagger generator.
3. Prefer verified compatible local candidate, specs and combined
   coverage/evidence worktrees before creating missing roles. Follow the
   [reuse contract](../do-linter-development-task-one-by-one/preparation.md#native-first-worktree-reuse).
   Native-first queues use three persistent worktrees; replay shares the
   evidence role, with temporary isolation for required recovery verification.
   Never reset, clean, or appropriate another task's checkout. Keep auxiliary
   checkouts under the caller's worktrees boundary, default `C:\dev\worktrees`.
   Prepare each candidate's separate writable specs runtime at the descriptor's
   frozen source commit, not the metadata commit or latest `typespec-next`.
4. Resolve the candidate's current head once. For a merged candidate, select
   canonical `main` containing the merge. Keep this identity separate from the
   baseline producer's candidate. Do not fetch moving refs again midtask.
5. Resolve a compatible compiler/library closure from the candidate checkout,
   including its actual `core` gitlink. Do not independently install arbitrary
   `latest` compiler and Azure packages. If newer specs require newer APIs,
   report the mismatch; do not silently downgrade specs or drop failed projects.
6. Record the descriptor commit, resolved SHAs, package/tool versions, selection policies and
   build/pack commands. Freeze them through the run. Related rule comparisons
   reuse the same shared baseline; changing the validator selector alone does
   not invalidate it. Only a separately requested producer refresh resolves new
   specs sources and executes the Swagger suite.

The tool snapshots the supplied clean checkouts, not remote branch names. The
skill owns descriptor selection and pinning. Preserve build logs proving that artifacts were
built from the selected candidate; artifact hashes alone do not prove that
source-to-build relationship.

For related mapping comparisons, resolve the candidate and specs references
once, then replay those exact commits and artifacts for each invocation instead
of fetching a new latest snapshot between comparisons. Use a distinct empty
output directory for every invocation and record all policy differences.
Shared immutable baseline data stays read-only. Parallel candidates require
separate writable specs runtimes: injection patches dependencies and must not
race. A shared writable checkout can only be used serially under exclusive ownership.

### Baseline lifecycle

Default to a downloaded, verified shared Swagger-only sealed run. Pass
`--baseline-run <absolute-completed-run-directory> --baseline-policy frozen-reference`
with the usual candidate/specs/tarball options and a **new empty output directory**. This skips
both Swagger generation and validator execution. It still patches/installs the
candidate and reruns native workers; it does not reuse stale native findings.
The shared run has schema-2 `manifest.json`, schema-1 `baseline.json`, and all
schema-4 dataset files. Its `assessmentMode: swagger-baseline`,
`completionScope: swagger-only` and `nativeAssessment: not-run` seal only Swagger
completion. They do not claim a native pass. The old schema-1 pilot manifests
are evidence, not reusable schema-2 baselines.

Without `--baseline-run`, the existing analyzer generates Swagger and executes
validators. That path is **producer-only**, for a separately requested shared
baseline creation/refresh, not a missing-cache recovery during migration.
Retain older immutable assets. See the [producer procedure](shared-baseline.md#explicit-producer-refresh).

Reuse verifies completion, exact specs source/package manager/selection,
project success/inventory, dataset schema/index/shards and every retained file's
SHA-256 before and after copying. Corrupt, partial, failed, escaping or symlinked
inputs fail explicitly; no silent refresh or compliant fallback occurs.
Retain all dataset files needed by the baseline inventory.

Historical-reference comparison assumes backward compatibility across current
candidate compiler/library/runtime upgrades; it does not assert identical
emission or require a lint-only compatibility receipt. Keep the saved producer
context and actual candidate context distinct. The tool records equivalence as
`not-determined`; discriminating semantic controls, fresh full native execution,
and investigations of failures and count gaps remain required.

Use `strict` only for an explicitly requested identical-runtime or reviewed
lint-only comparison. In that mode, identical candidate artifacts need no receipt;
changed lint artifacts require `--baseline-compatibility-receipt <absolute-json-path>`.
The tool verifies unchanged packed compiler/emission/library/metadata closure
outside the documented lint-file allowlist and content-bound reviewed assertions.
See both supported policies and the exact receipt boundary in
[native-coverage.md](../../../packages/typespec-lintdiff/docs/native-coverage.md).
A strict closure mismatch alone is not a migration blocker under the default
historical-reference policy. Neither policy is automatic semantic proof or
permission to use an unsupported `--force` flag, fabricate a receipt or regenerate
Swagger per rule. Actual required failures and unexplained gaps still block their
corresponding claims.

A receipt-required attempt preserves both identities in its manifest/error.
Review that evidence, then use a new output directory for the approved run;
do not overwrite failed evidence. Receipt identities use the documented compact
Node JSON representation, not an arbitrary JSON serializer or whitespace hash.

Specs SHA alone never establishes cache compatibility. Store immutable baselines,
compact results and member `migration.md` in the verified personal-fork evidence
worktree, with durable checksummed large assets under the
[evidence contract](../do-linter-development-task-one-by-one/evidence.md).
The runtime consumes a local completed-run directory: publishing/downloading
fork evidence and verifying portable replay are orchestration steps, not
automatic CLI features. Refresh creates a new baseline; it never replaces the
selected immutable one.

Follow [specs source retention](../do-linter-development-task-one-by-one/evidence.md#specs-source-retention)
as well as result storage. Prefer preserving the frozen source on a run-specific
branch in the verified existing personal specs fork. Record and verify its
repository/ref/SHA; keep authored source changes separate from runtime injection
and generated data. Unchanged, independently fetchable canonical source can be
recorded as a fallback. A source branch does not replace the baseline/assets or
prove portable CLI reuse.

## Prepare candidate artifacts

Read that checkout's toolchain and package-manager configuration. Check mise
first and use `mise exec --` where available. Initialize `core` at its gitlink.
Install only missing prerequisites or changed dependency manifests.
Use the [native dependency profile](../do-linter-development-task-one-by-one/preparation.md#native-first-dependency-profile)
for candidate setup: select the required official-package/tool closures, install
with `--frozen-lockfile --ignore-scripts`, then run the required builds and smoke
checks explicitly. Do not invoke unrelated emitter lifecycle setup as a proxy
for candidate readiness.

Use the existing external-integration architecture:

- Build the candidate package, Azure AutoRest emitter, rulesets, required
  dependency closures, and `@typespec/integration-tester`.
- Pack the built Azure and core package closures into a dedicated artifact
  directory. Inspect installed `chronus pack --help`; its `--only` selectors
  must include all required published dependencies, not just the changed rule.
- Keep unrelated unbuilt packages out of the artifact set. Verify full Git
  status after building and packing. Preserve unexpected changes for diagnosis.
- Use a clean isolated specs checkout with its declared Node/package manager.
  Do not pre-link the temporary lintdiff linter.

Run the analyzer's Node entrypoint with the **specs** package-manager version on
`PATH`. Running it through the tooling checkout's pnpm script can select the
tooling version instead. With mise, select the version read from the specs'
`package.json` for this invocation; do not encode it as a permanent skill default.
Verify its registry configuration too. pnpm 12 uses `PNPM_CONFIG_*` environment
variables, not `npm_config_*`; preserve the machine's approved registry without
changing shared global settings.

The analyzer invokes the candidate checkout's existing `tsp-integration`
**patch/install stages only**, with `--repo` and `--tgz-dir`. It deliberately
does not invoke its checkout stage, which can reset an existing checkout.
The integration implementation must support the specs package manager and
workspace overrides. Do not use an older npm-only runner on a pnpm workspace.

## Run the analyzer

From `packages\typespec-lintdiff` in the tooling checkout, with the correct
package manager already on `PATH`:

```powershell
node --import tsx/esm test\harness\native-coverage.ts `
  --candidate-repo C:\dev\worktrees\native-coverage-candidate `
  --specs-repo C:\dev\worktrees\azure-rest-api-specs-native-coverage `
  --tgz-dir C:\dev\coverage-artifacts\candidate `
  --validator-rule EnumInsteadOfBoolean `
  --tsp-rule @azure-tools/typespec-azure-core/no-boolean `
  --scope source `
  --baseline-run C:\dev\coverage-baselines\verified-compatible-baseline `
  --baseline-policy frozen-reference `
  --output C:\dev\coverage-runs\enum-pilot `
  --concurrency 2
```

Paths are examples, not permanent inputs. Choose a new output directory outside
both input checkouts. Never overwrite a prior run. The package script
`coverage:native` is also available when both checkouts use the same manager.
Do not insert an extra `--` between that package script and its options.

Use injected positive/compliant lightweight controls as representative preflight,
then run the full compatible baseline population. The published full ARM
`scope: source`, no-filter/no-limit baseline cannot be reused with a different
`boolean-http` scope, a `--filter`, or a `--limit`. Select a separately produced
compatible baseline or report that exact blocker; do not invent filtered reuse.
The example assumes backward compatibility across recorded runtime upgrades;
it does not assert identical artifacts or emission.
An explicitly requested separate pilot producer may use a case-sensitive literal
`--filter` and optional positive `--limit`, but its reduced population is partial
evidence and never substitutes for the full saved-population readout/native run.

Before declaring the injected-control population required, inspect the pinned
suite's fixtures and the candidate's actual rule registrations. Separate
portable harness controls from fixtures that require another migration's rule.
Record each group's applicability and the documented runner selection before
execution. An unrelated unmerged rule need not be added to the candidate just
to satisfy its fixtures. Retain every applicable portable control and add
positive/compliant controls for the selected rule. Disclose non-applicable
fixtures and selection counts; never call them passes or silently skip them.
This preflight does not authorize reclassifying a required failed suite after
execution or reducing the full baseline population.

When all fixtures apply, run the complete injected-package control suite from
the tooling repository root with
`NATIVE_COVERAGE_SPECS_REPO` set to the prepared specs checkout:

```powershell
mise exec -- pnpm --dir packages\typespec-lintdiff exec vitest run `
  test\harness\native-coverage-worker.test.ts
```

This control suite checks official-package loading, explicit activation despite
configuration disablement, compliance, authored suppression, missing-rule
failures, version-dependent boolean alignment, nonpayload visibility,
reference-only parameters, response headers, and shared schemas. It skips when
that environment variable is absent; skipped controls are not passing runtime
evidence.

Also verify default-emitted unreachable service schemas, explicit
`omit-unreachable-types` behavior, local children of externally referenced bases,
and named unions. Retain the complete relative-reference closure when moving
external Swagger files into the dataset; copied files can reference dependencies
outside a project output directory but must remain within the dataset boundary.

Derive semantic controls from the complete validator selector, not only the
native rule's existing tests. For the boolean pilot, also compare boolean
literals, nullable booleans, derived scalars, array items, and dictionary values
through the actual emitter and production validator. An exact standard-scalar
predicate need not recognize these emitted boolean schemas. Preserve and
document such native-rule gaps; do not manufacture native findings or change
production semantics as part of this analysis.

Repeat `--tsp-rule` for an explicit one-to-many mapping. Do not credit unrelated
diagnostics from an existing rule without investigating their attribution.
For an admitted many-to-one group, repeat `--validator-rule` instead and retain
exactly one native ID. Every migration candidate run uses `--baseline-run` and
defaults to explicit `--baseline-policy frozen-reference`, without a lint-only
receipt. All other required options remain.
Production ruleset enablement is not changed: the worker explicitly enables the
mapped rules only for the comparison, removes conflicting configuration-level
disable entries, preserves directly configured and inherited rule options, and
retains authored source suppressions.

### Alignment profiles

- `source`: raw source-program findings versus latest-version Swagger.
  Version/reachability populations are not aligned; do not claim equivalence.
- `http-reachable`: retain source findings whose locations occur in the
  selected-version HTTP graph. This is not a rerun of arbitrary version-sensitive
  predicates on a projected program.
- `boolean-http`: only for Azure Core `no-boolean`. Retain source findings
  represented by boolean properties or direct bodies in the selected-version
  HTTP graph. It uses structured compiler/HTTP/versioning metadata, not generated
  names or emitted-property-name matching. Payload traversal respects visibility,
  body-ignore and explicit-body metadata policies, including canonical shared
  read schemas. HTTP parameters and response headers are traversed separately;
  reference-only parameters do not contribute local schema findings.
  When `omit-unreachable-types` is false, the boolean profile also includes
  named schemas emitted from the selected service namespace. An unused named
  query model can therefore contribute a local Boolean schema even when the
  operation's parameter is reference-only. Distinguish these emitted schemas
  from the parameter reference instead of dropping their shared source location.

Keep raw findings even when alignment removes them. If a rule's predicate must
be reevaluated after projection, report that limitation and establish a supported
rule-specific profile before claiming equivalence.

## Inspect evidence and decide

The output contains:

- `manifest.json` (schema 2): run status, source/runtime/artifact identities,
  scope/policies, baseline context/identity and reuse/receipt provenance.
- `baseline.json` (schema 1): frozen context, exact dataset inventory/hashes
  and selected projects.
- `dataset`: freshly generated or integrity-verified copied Swagger, validator
  shards, raw output, API versions and failure metadata. No unchecked stale
  dataset is reused.
- `native-*.json`: raw and aligned target diagnostics, ambient diagnostics,
  default-activation findings, runtime package versions/entrypoint paths and
  entrypoint hashes, and projection receipts.
- `coverage.json` (schema 2) and `coverage.md`: aligned assessable project sets, both
  one-sided sets, unassessed projects, raw counts, conservative identity counts,
  and both directions of count differences.
- Group fields: explicit member observations, raw per-project difference and
  both directional excess sums, unavailable member attribution and undetermined
  completeness. Legacy location-count fields are conservative summaries, not
  normalized actionable-check counts.
- Per-stage and per-worker logs. Command failure is explicit and preserved.

A nonzero exit with an incomplete report means some projects remain unassessed;
retain the report and investigate. Do not turn it into a successful coverage
result. Zero target findings do not prove that the rule executed meaningfully.
Verify runtime package receipts against the injected candidate artifacts.

Follow the population, project-set, fixture, outlier, and cardinality analysis in
[analyze-swagger-typespec-lint-gap](../analyze-swagger-typespec-lint-gap/SKILL.md).
Its two-report reconciliation applies only when comparing those historical
reports; do not invent an old report for a fresh native-artifact run.

Inspect every one-sided project and representative outliers from both count
directions. Distinguish rule defects, source-to-emission multiplicity, selected
versions, references, suppression, and infrastructure failures. JSON paths and
source locations are different identities; do not use fuzzy or property-name
matching to declare exact correspondence.

Inspect validator-reported source documents, not just CLI input filenames.
AutoRest can diagnose a referenced document while validating another input.
Retain `validatorInputFile`, `sourceDocuments` and source attribution; ambiguous
or missing attribution must not become a claimed exact file-level identity.

For groups apply the
[diagnostic-count policy](../do-linter-development-task-one-by-one/native-first.md#counts-completeness-and-correspondence).
Raw counts are the starting observation; primary comparable counts need an
explicit justified unit. Preserve signed/absolute/relative per-project gaps and
both excess directions; equal corpus totals cannot cancel opposing gaps.
Count proven overlapping actionable defects once only with separate tested
normalization evidence. The CLI does not compute that normalization, relative
threshold acceptance or semantic correspondence automatically. "Close" counts
prioritize investigation, never waive an unexplained gap or omitted member.

The report intentionally returns `equivalence: not-determined`, even with
100% observed project coverage. State a separate evidence-backed semantic
conclusion with remaining limitations. Do not modify production semantics just
to equalize counts.

## Deliverable

Write `migration.md` using the shared
[four-section report plus NOTES contract](../analyze-swagger-typespec-lint-gap/SKILL.md#migration-note).
Link the original Swagger linter in the short conclusion. Keep raw diagnostic
totals distinct from project counts and justified after-analysis counts. Explain
only differing projects/diagnostic groups in section 4, with direct links to
grouped evidence and code-backed examples in the appendix. Put technical context
in NOTES, not a standalone fifth examples/actions section. Preserve behavior
coverage, material gaps and all required controls, investigations and replay
evidence; test-case counts do not measure production prevalence.

Return the report path, candidate/specs identities, actual loaded packages,
selected/assessable/failed population, raw and aligned results, scope limitations,
gap explanations, and a justified equivalence conclusion or explicit uncertainty.
Include the mapping record and per-validator conclusions for related
comparisons. State any unattributed shared-rule findings and deferred
many-to-many scope explicitly; never replace them with a combined coverage
percentage.
For publication, put concise, reproducible pilot evidence in authored tooling
documentation; keep generated corpora and machine-specific payloads out of Git.
The skill's orchestration must push the dedicated personal-fork evidence branch,
verify its actual remote head and return the actual branch-based report URL for
the PR plus separate immutable note/receipt links for audit and replay. Keep the
PR URL unchanged across report updates under the
[shared PR description contract](../shared/migration-pr-description.md). Include
the specs retention method and the instructions needed to recover inputs and
regenerate data and `migration.md`. Distinguish reading saved evidence,
reanalyzing downloaded observations and fully rerunning the frozen comparison;
report which paths were actually verified. Do not call a local worktree alone
durable publication or a count-audit replay full regeneration.

This skill does not replace native rule tests, default-activation integration
tests, normal external-integration checks, documentation validation, independent
review, or either migration review checkpoint.
