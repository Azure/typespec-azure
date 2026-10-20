---
name: analyze-native-lint-coverage
description: Run official TypeSpec Azure lints from a merged or unmerged build against real Azure specs and compare their observed coverage with a Swagger validator. Support one-to-one, one-to-many, and separate many-to-one comparisons; defer general many-to-many analysis. Resolve fresh inputs, inject candidate packages, and investigate gaps without assuming equal counts prove equivalence.
argument-hint: "[PR URL or native rule] [Swagger validator ID] [optional specs filter]"
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
IDs, original validator ID, and intended audience. Inspect the actual source,
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

Use **one Swagger validator rule per analyzer invocation**, with an explicit
list of official TypeSpec rule IDs. Record the validator ID, native IDs,
semantic checks supplied by each native rule, audience, rule options, alignment
profile, and supporting violating/compliant tests in the migration evidence.
This is a reviewable mapping record, not a new CLI manifest format.

| Mapping                                    | Procedure                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One Swagger rule to one TypeSpec rule      | Pass one `--validator-rule` and one `--tsp-rule`.                                                                                                                         |
| One Swagger rule to several TypeSpec rules | Repeat `--tsp-rule` for the rules that collectively implement the validator's checks. Preserve each rule's diagnostic identity and investigate its contribution.          |
| Several Swagger rules to one TypeSpec rule | Run a separate comparison for each Swagger rule, using the same native rule and frozen compatible inputs. Give each validator its own report and conclusion.              |
| General many-to-many                       | Defer group-level analysis and equivalence. Record the mapping and limitation; do not infer a cross-product of rule pairs or collapse the group into one coverage result. |

Do not repeat `--validator-rule`; the CLI rejects duplicate values. Do not
invent a multi-validator flag, mapping-file option, or group runner. Independent
one-to-one or one-to-many comparisons within a broader mapping can supply
scoped evidence, but do not establish equivalence for the whole group.

For many-to-one comparisons, a shared native rule can report checks unrelated
to the selected Swagger rule. Matching project sets can therefore hide a missing
check. Verify each validator's material checks with discriminating violating and
compliant fixtures, inspect the relevant native findings, and explain broader
native behavior. Do not attribute findings by message text or property names.
When reliable attribution is unavailable, report observed aggregate project
overlap and unresolved attribution rather than claiming equivalence.

Related comparisons may use different options or alignment profiles only when
those differences are explicit. Do not compare their totals as if they shared
the same execution policy. In particular, `boolean-http` supports only the
single Azure Core `no-boolean` rule, not a list of native rules.

Keep each validator's population, failures, one-sided project sets, raw counts,
and conclusion separate. Do not sum native findings across reports: a shared
native diagnostic may appear in several comparisons. Different rule IDs at the
same source location remain distinct findings; location coincidence does not
establish semantic identity.

## Fresh selection, immutable run

1. Record the caller's current branch before any checkout. Do not change its
   base merely because the candidate targets `main`.
2. Discover or prepare dedicated candidate and specs checkouts. Never reset,
   clean, or appropriate another task's checkout. Keep auxiliary checkouts under
   the caller's worktrees boundary, default `C:\dev\worktrees`.
3. Fetch the candidate's current head and the current
   `Azure/azure-rest-api-specs:typespec-next` branch. Select them once for this
   run. For a merged pilot, use current canonical `main` containing the merge,
   not a historical merge SHA as the permanent default.
4. Resolve a compatible compiler/library closure from the candidate checkout,
   including its actual `core` gitlink. Do not independently install arbitrary
   `latest` compiler and Azure packages. If newer specs require newer APIs,
   report the mismatch; do not silently downgrade specs or drop failed projects.
5. Record the resolved SHAs, package/tool versions, selection policies and
   build/pack commands. Freeze them through the run. A new independent run
   resolves fresh references; a replay checks out the recorded SHAs and uses
   the retained artifacts. Never refresh a moving ref halfway through a run.

The tool snapshots the supplied clean checkouts, not remote branch names. The
skill owns freshness selection. Preserve build logs proving that artifacts were
built from the selected candidate; artifact hashes alone do not prove that
source-to-build relationship.

For related mapping comparisons, resolve the candidate and specs references
once, then replay those exact commits and artifacts for each invocation instead
of fetching a new latest snapshot between comparisons. Use a distinct empty
output directory for every invocation and record all policy differences.
Run them serially when they share a writable specs checkout.

The current analyzer regenerates Swagger and validator results on every
invocation. It has no cached-dataset or native-receipt input. Retain the packages
and evidence, but do not claim that selecting the same commits skips execution.
Automatic baseline/native-result reuse is deferred tooling work.

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
failures, and version-dependent boolean alignment. It skips when that environment
variable is absent; skipped controls are not passing runtime evidence.

Repeat `--tsp-rule` for an explicit one-to-many mapping. Do not credit unrelated
diagnostics from an existing rule without investigating their attribution.
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
  names or emitted-property-name matching.

Keep raw findings even when alignment removes them. If a rule's predicate must
be reevaluated after projection, report that limitation and establish a supported
rule-specific profile before claiming equivalence.

## Inspect evidence and decide

The output contains:

- `manifest.json`: run status, selected source identities, artifact SHA-256
  hashes, scope, filtering and suppression policies, and command context.
- `dataset`: freshly generated Swagger, validator shards, raw output, selected
  API versions, and project failure metadata. No stale checked-in dataset is
  reused.
- `native-*.json`: raw and aligned target diagnostics, ambient diagnostics,
  default-activation findings, runtime package versions/entrypoint paths and
  entrypoint hashes, and projection receipts.
- `coverage.json` and `coverage.md`: aligned assessable project sets, both
  one-sided sets, unassessed projects, raw counts, conservative identity counts,
  and both directions of count differences.
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

The report intentionally returns `equivalence: not-determined`, even with
100% observed project coverage. State a separate evidence-backed semantic
conclusion with remaining limitations. Do not modify production semantics just
to equalize counts.

## Deliverable

Return the report path, candidate/specs identities, actual loaded packages,
selected/assessable/failed population, raw and aligned results, scope limitations,
gap explanations, and a justified equivalence conclusion or explicit uncertainty.
Include the mapping record and per-validator conclusions for related
comparisons. State any unattributed shared-rule findings and deferred
many-to-many scope explicitly; never replace them with a combined coverage
percentage.
For publication, put concise, reproducible pilot evidence in authored tooling
documentation; keep generated corpora and machine-specific payloads out of Git.

This skill does not replace native rule tests, default-activation integration
tests, normal external-integration checks, documentation validation, independent
review, or either migration review checkpoint.
