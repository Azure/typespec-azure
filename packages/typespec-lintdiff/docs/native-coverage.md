# Official-library coverage analysis

`coverage:native` compares an official TypeSpec Azure rule with a Swagger
validator on real specs. It uses the candidate checkout's `tsp-integration` to
inject built package artifacts. It never copies the rule into the temporary
lintdiff library.

Use the repository skill
[`analyze-native-lint-coverage`](../../../.github/skills/analyze-native-lint-coverage/SKILL.md)
for preparation, source/PR selection, package packing, execution, and gap
investigation.

## Design

The caller selects fresh candidate/specs checkouts and compatible build inputs.
The tool records their current commits and candidate artifact hashes at run
start, then generates new Swagger evidence for that exact specs commit unless
the caller explicitly selects a compatible retained baseline.
No historical specs commit or registry version is a permanent default.

The same candidate package artifacts supply the emitter and official lint.
Native compilation runs in a separate process per project and resolves the
compiler, HTTP/versioning libraries, and lint package from the specs checkout.
This prevents the tooling checkout's compiler from silently evaluating a
candidate built for a different TypeSpec version.

HTTP alignment filters payload properties using HTTP metadata and the emitter's
canonical shared-schema visibility. It retains explicit-body annotation
handling, separately visits actual parameters and response headers, and excludes
reference-only parameters, including their spread-source references. Filtering
never removes findings from the raw native receipt.

The boolean profile also follows `omit-unreachable-types`: when disabled, it
retains named schemas emitted from the selected service namespace even if no
operation reaches them. This includes local derived types and named unions.
Reference-only parameters remain distinct from default-emitted named parameter
models. The general `http-reachable` profile remains HTTP-only.

Swagger reference retention preserves relative references from copied external
files, including dependencies outside a project's output but inside the
dataset. Source reads stay inside the selected specs checkout or dataset.
Dependencies with conflicting destination content fail explicitly.

Explicit rule activation is local to the comparison. Existing source suppressions
and directly configured/inherited rule options remain effective. Raw diagnostics
are retained before optional selected-version
HTTP location alignment. The boolean profile uses native boolean metadata;
it does not match common property names between unrelated models.

Each selected project receives a receipt. Swagger compile failures, validator
failures, native compile failures, and worker/projection failures are unassessed,
not compliant or covered. The report includes raw unassessed validator counts.
An incomplete run exits nonzero after writing available comparison evidence.

Project coverage measures observed overlap only. Raw validator occurrences,
file-independent JSON paths, raw native diagnostics, and distinct native source
targets remain separate measures. The tool reports positive and negative count
differences separately and does not decide semantic equivalence.

## Supported CLI

From `packages\typespec-lintdiff`, with the **specs-declared package manager**
on `PATH`:

```powershell
node --import tsx/esm test\harness\native-coverage.ts `
  --candidate-repo C:\dev\worktrees\candidate `
  --specs-repo C:\dev\worktrees\specs `
  --tgz-dir C:\dev\coverage-artifacts\candidate `
  --validator-rule FirstValidator `
  --validator-rule SecondValidator `
  --tsp-rule @azure-tools/typespec-azure-core/example-rule `
  --scope source --concurrency 2 `
  --output C:\dev\coverage-runs\new-run
```

The example IDs are placeholders, not existing rule mappings. The worker
validates every requested validator against the injected production ARM rules.

Required options are `--candidate-repo`, `--specs-repo`, `--tgz-dir`, `--output`,
one or more `--validator-rule`, and one or more `--tsp-rule`. Repeated validator
IDs and repeated native IDs are errors. One validator can map to several native
rules. Several validators can map to **one** native rule. More than one of each
is rejected: general many-to-many analysis is not supported.

Optional options:

| Option                                  | Meaning                                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `--scope source`                        | Default. Source findings; versions are not aligned.                                            |
| `--scope http-reachable`                | Retain source locations in the selected-version HTTP graph.                                    |
| `--scope boolean-http`                  | Boolean HTTP metadata alignment; only Azure Core `no-boolean`.                                 |
| `--concurrency N`                       | Positive integer, default `2`.                                                                 |
| `--filter TEXT`                         | Case-sensitive literal project-path substring, not a regex.                                    |
| `--limit N`                             | Positive integer; omit with the filter for the full discovered population.                     |
| `--baseline-run PATH`                   | Completed retained schema-2 run; bypass Swagger generation and validation.                     |
| `--baseline-compatibility-receipt PATH` | Reviewed JSON receipt for a changed candidate/runtime installation; requires `--baseline-run`. |

Unknown options and duplicate singleton options are errors. Output must be new
or empty and outside both input checkouts. Candidate and specs inputs must be
clean. The tool never fetches or refreshes refs. The caller resolves latest
inputs for the first run, then explicitly selects frozen inputs for reuse.
The existing candidate integration patch/install stages still run during reuse.
Specs package-manager handling is unchanged; do not run through a mismatched
tooling-checkout package manager.
Parsed configuration uses `validatorRules: string[]` and `tspRules: string[]`;
the legacy `validatorRule` field contains the first validator ID. Other fields
use camel case: `candidateRepo`, `specsRepo`, `tgzDir`, `output`, `scope`,
`concurrency`, optional `filter`, `limit`, `baselineRun`, and
`baselineCompatibilityReceipt`. There is no mapping-file CLI option.

## Baseline retention and compatibility

New runs write schema-2 `manifest.json` and an immutable `baseline.json`
(schema 1). Older runs without this sealed evidence cannot be imported as a
reusable baseline. The first run generates all validator shards, not only the
requested member rules.

`baseline.json` contains `schemaVersion`, `context`, `files`, and `projects`.
`files` inventories **every** dataset file by relative `file` and `sha256`.
`projects` retains the exact project records, API versions, and failure fields.
The context contains:

- `specsCommit`, `specsRepository`, `coreCommit`, `nodeVersion`,
  `specsPackageManager`, `scope`, optional `filter` and `limit`;
- `generatorFiles` and `toolingDependencies`, arrays of `{ file, sha256 }`;
- `runtimeInstallation`, an array of hashes for available specs manifests,
  source lockfiles, and installed npm/pnpm lockfiles;
- `candidateCommit` and `artifacts`, an array of tarball basenames and hashes.
- `lintArtifactContents`, packed file inventories for supported official lint
  packages. Each entry contains `artifact` and `files: [{ file, sha256 }]`.

The manifest separately records the current candidate/artifacts and
`baselineContext`. Its `baselineIdentity` hashes the retained original
`baseline.json` content. Reuse keeps that original baseline artifact identity;
it does not relabel old Swagger as emitted by the new candidate.
`baselineReuse` records the source run, source manifest hash, baseline identity,
and the validated compatibility receipt and its content identity.
Original runtime manifest/lock bytes are retained under
`dataset\_baseline-runtime`; each new execution also saves its current bytes
under `runtime-installation`. Review those contents, not only the hashes, when
assessing dependency compatibility.

Reuse requires a completed run with a finished timestamp and matching baseline
identity. It verifies schema-4 dataset/index/shards, a nonempty exact specs
revision and population selection, referenced files, shard counts, selected
projects, dataset containment, and every file hash. It rejects added, missing,
modified, and symbolic-link files. Every shard and raw/failure-inventory file is
copied into the new run, then checked again. Failed, partial, empty, corrupt,
or incompatible baselines never become successful cache hits. A retained run
with any unassessed project is not reusable. Fresh failed runs still retain
their evidence and report unassessed projects.

Automatic compatibility requires identical candidate commit, tarball inventory
and hashes, installation fingerprints, core commit, generator files, tooling
dependency fingerprints, Node/package-manager identities, specs identity, and
selection/profile settings. These are conservative content checks, not a new
engine-locking system or complete source-to-build attestation.

### Changed lint candidates: explicit review receipt

A changed candidate can reuse unchanged Swagger only with a reviewed,
content-bound compatibility receipt. Compiler/emitter artifact changes,
artifact additions/removals/renames, core changes, tooling dependency changes,
generator changes, and selection/runtime-policy changes invalidate reuse even
with a receipt.

Only artifacts whose basenames identify Azure Core, Resource Manager, or Client
Generator Core can have changed hashes. The tool reads their gzip/tar contents
without extracting files and compares the complete packed file inventories.
Only JavaScript, declaration, and source-map files under `dist/src/rules`, plus
`dist/src/linter`, may differ. All other packed content must be byte-identical,
including package/dependency metadata, decorators, TypeSpec libraries, and
emission helpers. Unsupported archive metadata, links, and unverifiable or
changed emission closures fail closed.

This restricted byte comparison supplies verifiable packed emission-closure
evidence, but **does not prove** arbitrary rule code is lint-only. The reviewer
must still inspect the actual source and built content
and reject metadata, dependency, emission, library-semantic, or unknown changes.
Installation-fingerprint differences must be explained solely by the reviewed
lint artifact injection, not by changed dependency resolution. If that cannot
be established, create a fresh baseline.

The receipt is a JSON object with this exact required content:

```json
{
  "schemaVersion": 1,
  "baselineIdentity": "<SHA-256 of JSON.stringify(parsed baseline.json)>",
  "candidateContextIdentity": "<SHA-256 of JSON.stringify(new manifest.baselineContext)>",
  "reviewedBy": "<nonempty reviewer identity>",
  "rationale": "<nonempty evidence-backed compatibility explanation>",
  "assertions": {
    "lintOnly": true,
    "unchangedCompiler": true,
    "unchangedLibraries": true,
    "unchangedEmission": true,
    "unchangedMetadata": true,
    "unchangedDependencies": true,
    "noUnknownChanges": true
  }
}
```

Hashes use UTF-8, compact `JSON.stringify` output, no trailing newline, and the
persisted object order. No signature or reviewer authentication is implemented.
The receipt is an explicit human compatibility contract layered on the packed
closure comparison, not automated semantic proof. Do not generate affirmative
assertions without review. Shared non-rule helper changes require a fresh
baseline, even if a reviewer believes those changes are lint-only.

If a receipt is needed, the reuse attempt stops before Swagger/native execution,
retains the current `baselineContext` in its failed manifest, and prints both
required content identities. Review that snapshot and the original artifacts,
prepare the receipt, and rerun with a **different empty output directory**.
Any changed context requires a new matching receipt. The tool never silently
falls back to regeneration or accepts a partial baseline.

## Group counting and completeness

The primary comparison sums raw occurrences from each selected validator shard
and compares that sum with aligned native diagnostics, **counted once per
project**, not once per member. `projects[].rawDifference` is validator raw
minus native aligned. `rawValidatorExcess` and `rawNativeExcess` sum the positive
and negative per-project differences separately. Offsetting project differences
therefore remain visible even when aggregate totals match.

The report retains `members[].observations`, member raw counts and project sets,
including zero-fired members and findings on unassessed projects. Member native
attribution and semantic completeness remain unavailable/not determined.
Member `rawCount` includes all selected projects; `assessableRawCount` and
`unassessedRawCount` separate its populations. Group `validatorRawCount` is
assessable only; `selectedValidatorRawCount` also includes unassessed findings.
Unassessed validator/native raw counts stay separate from the comparison.
Every member needs discriminating semantic tests; a shared native finding does
not credit all group members.

Raw counts remain separate from file-independent `(validator rule, JSON path)`
identities and native `(rule, file, line, column)` identities. Distinct validator
checks at the same JSON path remain distinct. Locationless native findings are
not collapsed. The existing `difference`, `validatorExcess`, and `nativeExcess`
fields remain **location-identity** measures, not the primary raw-count measures.
Cross-validator semantic overlap requires an explicit independent analysis;
there is no fuzzy matching, automatic overlap normalization, configurable
count-normalization engine, or per-member native coverage inference.

Use project sets as guardrails and inspect failures, every one-sided project,
and both count-excess directions. Equal or close counts never establish
equivalence and never waive unexplained gaps.

## Validation

```powershell
mise exec -- pnpm --dir packages\typespec-lintdiff exec vitest run test\harness\native-coverage.test.ts
```

The tests cover strict arguments, explicit mappings, failure accounting,
one-sided populations, zero-denominator coverage, duplicate source targets,
locationless diagnostics, and conservative cardinality identities.

Set `NATIVE_COVERAGE_SPECS_REPO` to an artifact-injected specs checkout and include
`test\harness\native-coverage-worker.test.ts` for runtime controls. Those controls
are skipped without that checkout. They cover violating/compliant inputs,
explicit activation, configuration disablement, source suppression, missing
native/upstream rules, and two selected API versions with removed/type-changed
boolean properties. They do not rely on the tooling checkout's compiler.

## PR #5265 pilot

PR [#5265](https://github.com/Azure/typespec-azure/pull/5265) maps
`EnumInsteadOfBoolean` to Azure Core `no-boolean`. The following are observations
from a fresh run, **not permanent input pins or full-corpus equivalence evidence**.

| Input                                       | Resolved identity                          |
| ------------------------------------------- | ------------------------------------------ |
| Candidate canonical `main` containing #5265 | `d212c494e90f880c9dc729ec5ff575e4691172d2` |
| Candidate `core` gitlink                    | `cf8712b9957d4a25d7c6cd338e42e7bffaf9f98a` |
| Specs `typespec-next`                       | `2cd3c5dd6d00a5f53214fe594afd2aef3f44d3f9` |
| Node / specs-declared pnpm                  | `26.5.0` / `12.6.0`                        |
| Runtime compiler / HTTP                     | `1.17.0` / `1.17.0`                        |
| Runtime Azure Core / AutoRest emitter       | `0.73.0` / `0.73.1`                        |
| Runtime versioning                          | `0.87.0`                                   |
| AutoRest launcher / validator / rulesets    | `3.8.0` / `2.2.4` / `2.2.6`                |

Preparation used the candidate's own dependency closure:

```powershell
mise exec -- pnpm install --filter . --filter ./core `
  --filter '@azure-tools/typespec-azure-rulesets...' `
  --filter '@azure-tools/typespec-autorest...' `
  --filter '@typespec/integration-tester...' --frozen-lockfile --ignore-scripts
mise exec -- pnpm -r --filter '@azure-tools/typespec-azure-rulesets...' `
  --filter '@azure-tools/typespec-autorest...' `
  --filter '@typespec/integration-tester...' build
```

Chronus packed Azure AutoRest, Azure Core, Azure Examples, Resource Manager,
Azure Rulesets and Client Generator Core. The matching core artifacts were
compiler, asset-emitter, events, HTTP, JSON Schema, OpenAPI, REST, SSE, streams,
versioning and XML. Use repeated `--only <package>` selectors with
`chronus pack --pack-destination <directory>` from the respective workspace.
The run manifest records every tarball's SHA-256; worker receipts record the
actual installed entrypoints, versions and entrypoint SHA-256 values.

With the specs-declared package manager on `PATH`, from the tooling package:

```powershell
node --import tsx/esm test\harness\native-coverage.ts `
  --candidate-repo <fresh-candidate-checkout> `
  --specs-repo <fresh-specs-checkout> `
  --tgz-dir <packed-candidate-artifacts> `
  --validator-rule EnumInsteadOfBoolean `
  --tsp-rule @azure-tools/typespec-azure-core/no-boolean `
  --scope boolean-http --limit 8 --concurrency 4 `
  --output <new-run-directory>
```

This selected the first eight projects discovered by the existing ARM generator,
not a random or representative full-corpus sample:

| Project                        | Selected API version | Swagger raw | Native raw | Native aligned | Native source targets |
| ------------------------------ | -------------------- | ----------: | ---------: | -------------: | --------------------: |
| Advisor                        | `2026-08-01-preview` |           2 |          3 |              2 |                     2 |
| AgriculturePlatform.Management | `2024-06-01-preview` |           1 |          1 |              1 |                     1 |
| AlertProcessingRules           | `2021-08-08`         |           2 |          2 |              2 |                     2 |
| AlertRuleRecommendations       | `2023-08-01-preview` |           0 |          0 |              0 |                     0 |
| AlertsManagement               | `2025-05-25-preview` |           6 |         11 |             11 |                     6 |
| PreviewAlertRule               | `2025-07-01-preview` |           3 |          3 |              3 |                     3 |
| PrometheusRuleGroups           | `2023-03-01`         |           4 |          4 |              4 |                     4 |
| TenantActivityLogAlerts        | `2023-04-01-preview` |           2 |          2 |              2 |                     2 |
| **Total**                      |                      |      **20** |     **26** |         **25** |                **20** |

All eight projects were assessable. Seven violation-bearing projects overlapped;
neither tool had a one-sided project. Observed validator-project coverage was
100%, with zero count excess in either direction after conservative source
deduplication. All projects had zero target findings under their normal defaults.
The positive comparison therefore depends on explicit opt-in, not a production
ruleset change.
The primary raw-count comparison has 20 Swagger occurrences versus 25 aligned
native diagnostics, with five native-excess occurrences in AlertsManagement.
The location-count parity below does not remove or automatically justify that
raw-count difference.

Advisor's extra raw finding targets `models.tsp:749`, the boolean `tracked`
property removed in `2026-02-01-preview`. It is absent from the selected
`2026-08-01-preview` HTTP graph. AlertsManagement retains eleven raw findings but
only six source locations. Five locations occur twice: `Alert.tsp:195`,
`Alert.tsp:201`, `Alert.tsp:319`, `Alert.tsp:325`, and `routes.tsp:55`.
All raw occurrences remain available; the analyzer does not rewrite the rule
or claim a one-to-one identity mapping between JSON paths and source targets.

The pilot also exposed two reused-generator problems: AutoRest misread a
Windows local validator path as a package reference, and emission updated
the specs' `service.yaml`. The generator now uses a file URL and disables
service metadata emission. Regression tests cover both; a completed run checks
that candidate/specs source checkouts are still clean and at their initial SHAs.

The result supports project-level and conservative count parity **for this
sample**. It does not establish arbitrary diagnostic-level equivalence, all-version
equivalence, or full-corpus coverage. The tool continues to return
`equivalence: "not-determined"`. A full assessment must omit `--limit`, inspect
both one-sided sets and both count-excess directions, and investigate failures.
The source-location profile is not a general substitute for reevaluating
version-sensitive predicates on projected types.

AutoRest's core engine is selected by its existing `--v3` resolution, separately
from the recorded launcher and validator packages. Raw logs retain that resolution.
The manifest does not yet provide a complete transitive dependency lock or
automatically attest source-to-tarball provenance. Retain build/pack logs and the
run's installed dependency store for strict replay. Normal external-integration
and base-versus-PR regression checks remain separate required gates.

## Retained-baseline reuse smoke test

On 20 October 2026, a fresh schema-2 one-project run and a second run using
`--baseline-run` both completed successfully. This test deliberately reused
**historical frozen pilot inputs**, not newly resolved latest candidate/specs
refs:

- Candidate: `d212c494e90f880c9dc729ec5ff575e4691172d2`.
- Specs: `2cd3c5dd6d00a5f53214fe594afd2aef3f44d3f9`.
- Artifacts: the same 17 retained pilot tarballs; no changed-artifact receipt.
- Mapping/profile: `EnumInsteadOfBoolean` → Azure Core `no-boolean`,
  `boolean-http`, `--limit 1 --concurrency 1`.
- Specs package manager: `pnpm@12.6.0`, selected explicitly through mise.

To reproduce, prepare clean checkouts at those commits and the retained artifact
set. From `packages\typespec-lintdiff`, set `$candidateRepo`, `$specsRepo`, and
`$tgzDir` to their absolute paths. Set `$firstRun` and `$secondRun` to distinct,
new empty output directories outside both checkouts and each other:

```powershell
$common = @(
  "--candidate-repo", $candidateRepo,
  "--specs-repo", $specsRepo,
  "--tgz-dir", $tgzDir,
  "--validator-rule", "EnumInsteadOfBoolean",
  "--tsp-rule", "@azure-tools/typespec-azure-core/no-boolean",
  "--scope", "boolean-http",
  "--limit", "1",
  "--concurrency", "1"
)
mise exec pnpm@12.6.0 -- node --import tsx/esm test\harness\native-coverage.ts `
  @common --output $firstRun
mise exec pnpm@12.6.0 -- node --import tsx/esm test\harness\native-coverage.ts `
  @common --baseline-run $firstRun --output $secondRun
```

The retained observations were:

| Evidence                                      | Result                                                             |
| --------------------------------------------- | ------------------------------------------------------------------ |
| Run directories                               | `native-baseline-reuse-first`, `native-baseline-reuse-second`      |
| Manifest status                               | Both `complete`                                                    |
| Baseline identity, both runs                  | `aa5c9186d63cc6fbb5166e41857c5b7b7991aab1e2cd1a9bcacf72ec832ad43e` |
| Reuse provenance: source manifest SHA-256     | `f7328fb9d0938e9f6c218574ddeb5c0dc85d12f3304b1c4a2e950c4e4c1d266d` |
| Selected / assessable projects                | `1 / 1`                                                            |
| Swagger raw occurrences                       | `2`                                                                |
| Native raw / aligned / source-location counts | `3 / 2 / 2`                                                        |
| Raw validator / native excess                 | `0 / 0`                                                            |
| Location-identity validator / native excess   | `0 / 0`                                                            |
| Second-run Swagger execution                  | No generator/validator stage and no `swagger.log`                  |
| Candidate/specs source state                  | Both clean after execution                                         |

Replay writes its own provenance and can have a different manifest hash. Check
the source-manifest hash against that replay's actual first manifest, not the
historical value above. Native execution still runs on reuse.

This verifies the unchanged-input baseline-reuse path for one project. It is
not full-corpus evidence, group-analysis evidence, changed-artifact compatibility
evidence, or a semantic-equivalence claim. Raw and source-location measures
remain separate; the tool returns `equivalence: "not-determined"`.
