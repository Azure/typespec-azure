---
name: analyze-native-lint-coverage
description: Run merged or unmerged official TypeSpec Azure lints against real specs. Compare one-to-one, one-to-many or explicit many-to-one mappings using fresh or verified reusable Swagger baselines. Preserve member evidence and diagnostic counts without assuming equal totals prove equivalence; defer general many-to-many.
argument-hint: "[PR URL or native rule] [Swagger validator IDs] [optional baseline run or specs filter]"
user-invocable: true
---

# Analyze native lint coverage

Use this skill to test an official-library implementation without first copying
it into `tsp-lintdiff-local-linter`. Merged and unmerged implementations use the
same artifact-injection and comparison path. This is an analysis workflow, not
authorization to modify the rule, enable it by default, or rewrite the migration
queue.

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

## Fresh selection, immutable run

1. Record the caller's current branch before any checkout. Do not change its
   base merely because the candidate targets `main`.
2. Discover or prepare dedicated candidate and specs checkouts. Never reset,
   clean, or appropriate another task's checkout. Keep auxiliary checkouts under
   the caller's worktrees boundary, default `C:\dev\worktrees`.
3. For a new baseline, fetch the candidate's current head and the current
   `Azure/azure-rest-api-specs:typespec-next` branch. Select them once for this
   run. For a merged pilot, use current canonical `main` containing the merge,
   not a historical merge SHA as the permanent default. For explicit reuse,
   read the baseline's specs/closure instead of resolving latest again.
4. Resolve a compatible compiler/library closure from the candidate checkout,
   including its actual `core` gitlink. Do not independently install arbitrary
   `latest` compiler and Azure packages. If newer specs require newer APIs,
   report the mismatch; do not silently downgrade specs or drop failed projects.
5. Record the resolved SHAs, package/tool versions, selection policies and
   build/pack commands. Freeze them through the run. A baseline refresh resolves
   fresh references; second/third candidate runs can select the same completed
   baseline. Never refresh a moving ref halfway through a comparison.

The tool snapshots the supplied clean checkouts, not remote branch names. The
skill owns freshness selection. Preserve build logs proving that artifacts were
built from the selected candidate; artifact hashes alone do not prove that
source-to-build relationship.

For related mapping comparisons, resolve the candidate and specs references
once, then replay those exact commits and artifacts for each invocation instead
of fetching a new latest snapshot between comparisons. Use a distinct empty
output directory for every invocation and record all policy differences.
Run them serially when they share a writable specs checkout.

### Baseline lifecycle

Without `--baseline-run`, the analyzer generates a fresh dataset and writes
schema-2 `manifest.json` plus schema-1 `baseline.json`. To reuse that completed
run, pass `--baseline-run <absolute-completed-run-directory>` with the usual
candidate/specs/tarball options and a **new empty output directory**. This skips
both Swagger generation and validator execution. It still patches/installs the
candidate and reruns native workers; it does not reuse stale native findings.
The old schema-1 pilot manifests are evidence, not reusable schema-2 baselines.

Reuse verifies completion, source/runtime/generator/settings compatibility,
project success/inventory, dataset schema/index/shards and every retained file's
SHA-256 before and after copying. Corrupt, partial, failed, escaping or symlinked
inputs fail explicitly; no silent refresh or compliant fallback occurs.
Retain all dataset files needed by the baseline inventory.

Identical candidate artifacts need no compatibility receipt. Changed lint
artifacts require `--baseline-compatibility-receipt <absolute-json-path>`.
The tool verifies unchanged packed compiler/emission/library/metadata closure
outside the documented lint-file allowlist and requires content-bound reviewed
assertions. See the exact receipt schema and compatibility boundary in
[native-coverage.md](../../../packages/typespec-lintdiff/docs/native-coverage.md).
This is not a signed attestation or automatic semantic proof. Review changed
lint code, installation manifests/locks and emission effects; uncertainty,
changed dependencies/metadata/emitter or an unsupported closure requires a new
baseline, not an unsupported `--force` flag.

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
  --scope boolean-http `
  --output C:\dev\coverage-runs\enum-pilot `
  --concurrency 2
```

Paths are examples, not permanent inputs. Choose a new output directory outside
both input checkouts. Never overwrite a prior run. The package script
`coverage:native` is also available when both checkouts use the same manager.
Do not insert an extra `--` between that package script and its options.

Start with a representative `--filter <literal-substring>` and optional
`--limit <positive-integer>`. The filter is case-sensitive and is not a regex.
Verify a nonempty selected population and target activation with known
violating/compliant controls before an expensive corpus run. Then omit both
options for the full discovered ARM corpus when required. A scoped pilot is
partial evidence, never full-corpus validation.

From the tooling repository root, run the injected-package controls with
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
exactly one native ID. For a second candidate run add `--baseline-run` and, when
required, a reviewed compatibility receipt; all other required options remain.
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
[five-section report contract](../analyze-swagger-typespec-lint-gap/SKILL.md#migration-note).
Highlight evidenced core behavior alongside remaining gaps, distinguish targeted
corner-case tests from production prevalence, and provide quick inline examples
with direct links to the others. Keep full evidence and reproduction details in
a linked appendix; brevity does not waive any required control or investigation.

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
verify its actual remote head and return immutable note/receipt links. Include
the specs retention method and the instructions needed to recover inputs and
regenerate data and `migration.md`. Distinguish reading saved evidence,
reanalyzing downloaded observations and fully rerunning the frozen comparison;
report which paths were actually verified. Do not call a local worktree alone
durable publication or a count-audit replay full regeneration.

This skill does not replace native rule tests, default-activation integration
tests, normal external-integration checks, documentation validation, independent
review, or either migration review checkpoint.
