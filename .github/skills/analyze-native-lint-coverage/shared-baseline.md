# Shared Swagger baseline consumer and producer

Native-first migration consumes a shared sealed Swagger baseline by default.
Native-first is the default for new rule-ID and task-file queues. Legacy
migration remains available through `--flow legacy` and compatibility/resumption
routing; its execution contract is unchanged.
Do not regenerate Swagger for each rule or candidate.

## Monthly evaluation snapshot

At the start of each monthly TypeSpec Azure release cycle, the dedicated
baseline producer resolves and pins the latest canonical
`Azure/azure-rest-api-specs:main` commit, the TypeSpec Azure producer commit and
its actual `core` gitlink, then generates and publishes one full ARM Swagger
baseline. Complete and verify publication before consumer migration runs begin.
Confirm the specs dependency upgrade for that release has landed, and record
the actual installed compiler/library versions rather than inferring them from
the date or the producer branch name.
This is a scheduled release-cycle refresh, not an automatic refresh for every
PR or source-SHA change. Select once and freeze the baseline through the cycle.
An out-of-cycle refresh requires explicit producer authorization and evidence
of material incompatibility or unresolved baseline validity.
This defines the producer cadence; it does not install a scheduler or authorize
consumer workers to start a producer automatically.

Keep three identities separate:

- Develop each new native rule on a branch based on current canonical
  `Azure/typespec-azure:main`; do not move development onto the baseline producer.
- Evaluate coverage against the selected baseline's exact specs `source.commit`,
  population and recorded dependency/runtime context. Do not fetch a newer specs
  tip for each PR. Scope conclusions to this frozen corpus, not latest specs.
- Record the actual injected candidate artifacts and compiler/library closure.
  The baseline producer's runtime is provenance, not permission to relabel the
  candidate or silently replace its dependencies with older packages.

Reuse is the default within the cycle. Assume the compiler and libraries built
from current canonical `Azure/typespec-azure:main` remain backward-compatible
with the frozen specs source. Use the supported
`--baseline-policy frozen-reference` together with `--baseline-run`: reuse saved
Swagger diagnostics and run fresh native diagnostics across the full frozen
corpus. A newer core/compiler/library/emitter version or commit alone is not a
blocker and does not require a lint-only receipt or baseline refresh.

This is an explicit backward-compatibility assumption, not proof of unchanged
emission, dependencies or rule inputs. Preserve the baseline producer's identities
and record the candidate's actual identities separately. Successful compilation
establishes authorability, not identical emitted paths or schemas. Investigate
actual failures and diagnostic-count gaps; never infer equivalence from this
assumption alone.

For each consumer comparison, inspect actual source/artifact changes from the
baseline producer to the candidate. Distinguish unrelated and lint-only changes
from compiler, emitter, decorators, libraries, dependencies and settings that
can affect emission. Retain the change inventory, rationale, focused relevant
controls and selected baseline-policy result. This compatibility assessment
does not replace the scheduled monthly producer refresh. Check the mapped
validator's relevant wire behavior; do not infer whole-corpus equivalence from
a few passing controls.
Required final native execution, activation/suppression controls, population and
count investigations, integration checks and independent reviews remain intact.

The analyzer defaults to `strict`, which rejects core changes and packed changes
outside its lint-only allowlist. Select `frozen-reference` explicitly for this
consumer workflow; a strict-policy closure mismatch alone does not establish a
migration blocker. Keep `strict` for an explicitly requested identical-runtime
or reviewed lint-only comparison. Verify that pinned tooling supports the chosen
policy before execution; missing support is a tooling prerequisite, not permission
to invent flags, edit sealed identities or fabricate compatibility receipts.

Run one producer refresh per monthly TypeSpec release cycle using the latest
pinned specs commit. A new PR or SHA difference alone does not justify an
additional out-of-cycle refresh. Disclose whether any exceptional refresh is
due to a real behavior change, unavailable proof or a tooling limitation. Keep
old baselines immutable and finish an active run on its selected snapshot.

## Discover before setup

1. Discover the published baseline in the verified specs fork. The initial
   publication contract is `msyyc/azure-rest-api-specs`,
   branch `evidence/shared-swagger-baseline`. Fetch this branch through the
   caller's verified remote, using `git fetch`, and record its exact commit.
   Read `.lintdiff-baselines\current.json` at that commit, not the worktree's
   moving branch tip. Resolve `baselineId` from that file to
   `.lintdiff-baselines\<baselineId>\baseline.json` at the same commit, and
   retain both descriptors. They must agree on baseline identity.
   Treat `current.json` as discovery only; never reread it midway through a task.
2. Save the selected schema-1 descriptor to an absolute local JSON path.
   Record metadata repository/ref/commit, version path and descriptor SHA-256.
   The metadata commit adds discovery files: it is **not** the tested specs SHA.
   The frozen source is the selected descriptor's `source.commit`. Recover it
   from `source.repository` or the recorded preservation repository/ref. Verify
   the source SHA before preparing a clean isolated runtime.
3. Check the combined coverage/evidence worktree's local area for the selected
   baseline before downloading. Reuse a complete matching local run read-only
   only after verifying its descriptor/source identity, completion, inventory,
   file hashes and required compatibility. Prior success or directory existence
   alone is insufficient. Retain the verification receipt; partial replay
   extractions and failed runs are not sealed baselines.

   If a complete verified local run is unavailable, recover it with the stdlib
   helper below. Prefer a retained archive through `--archive` after checking
   its descriptor-bound size/hash; download only when the archive is missing.

   ```powershell
   mise exec -- python -X utf8 -B C:\dev\worktrees\tooling\.github\skills\analyze-native-lint-coverage\shared_baseline.py fetch `
     --descriptor C:\dev\baseline-inputs\selected-descriptor.json `
     --output C:\dev\baseline-inputs\selected-baseline
   ```

   Use actual paths. Helper output must not exist; do not overwrite a retained
   run or invoke `fetch` on its populated directory. To use a local archive, add
   `--archive C:\dev\baseline-inputs\selected-baseline.tar.gz`.
   Otherwise the helper invokes `gh release download` once with the descriptor's
   explicit repository/release/name. Use the caller's authorized GitHub CLI
   authentication; the helper does not guess an owner or change authentication.
   Private download staging is a unique sibling of output, not system temp.
   Failed downloads/extractions remain available for diagnosis; do not reuse
   their output directories. After verified success, the caller can remove the
   download staging if it is no longer needed.

4. Retain the returned `baselineRun`, `baselineId`, `sourceCommit`,
   `baselineIdentity` and `swaggerGeneration: not-run`. Keep this verified
   shared input read-only. Give every parallel candidate a separate writable
   specs runtime at the frozen source commit and a separate analyzer output.
   Never inject packages into the shared baseline or a concurrent runtime.

Missing publication, access, descriptor fields, checksums, source, inventory,
schemas or supported compatibility is an exact prerequisite blocker. Apply the
compatibility assessment to consumer candidates against the frozen baseline.
The helper does not fetch latest refs, install packages, compile, emit, run
validators, refresh data or retry downloads. Preserve failed evidence and report
the required immutable asset/descriptor/source or scheduled/authorized producer
refresh.

## Descriptor and integrity contract

The schema-1 descriptor contains exactly:

- `schemaVersion`, `baselineId`, `assessmentMode: swagger-baseline`.
- `source`: `repository`, `commit`, `preservationRepository`, `preservationRef`.
- `producer`: `candidateRepository`, `candidateCommit`, `coreCommit`,
  `toolingRepository`, `toolingCommit`, `nodeVersion`, `scope`, `selection`
  (`serviceType: resource-manager`, `filter: null`, `limit: null`), `observedAt`.
- `dataset`: `projects`, `swaggerFiles`, `compileFailures`, `validationFailures`,
  `observations`, `rulesWithFindings`.
- `baselineIdentity`.
- `archive`: `repository`, `release`, `name`, `sha256`, `bytes`.

The archive repository must be the source preservation repository. Resolve the
release, asset name, size and SHA-256 from the selected descriptor; never infer
them from a baseline ID or copy a prior release's values. Large data are
checksummed release assets, not hundreds of megabytes committed to Git. The
archive root contains only
`manifest.json`, `baseline.json`, and `dataset\**`, retaining everything the
existing baseline loader needs.

The helper verifies compressed bytes/size before extraction. It rejects escaping
paths, links, special members, duplicate/case-colliding names and unexpected
members. One bounded dataset inventory pass verifies all file SHA-256 hashes,
including retained TypeSpec source. It preserves original Windows inventory
strings when checking Node compact JSON content identity; normalization is only
for filesystem comparisons. The baseline schema uses safe integer numbers.
The helper also verifies sealed schema-2 Swagger-only completion, schema-1
baseline identity/source/producer, schema-4 completed metadata, successful full
project population, file references, summary, index, shard counts and totals.
This integrity check does not replace the analyzer's compatibility checks.

Publication may replace machine-specific absolute path prefixes in copied raw
logs/messages with `$BASELINE_DATASET`, `$SPECS_ROOT`, `$CANDIDATE_ROOT`,
`$TOOLING_ROOT` and `$USER_PROFILE`. Keep source data unchanged and retain
source-to-published file hashes in the sealing evidence. Preserve counts, rule
IDs, relative targets and the compatibility context. Recompute published file
inventory and baseline identity; consumers always use the descriptor's published
identity, never a hardcoded original run identity. Manifest
`sourceBaselineIdentity` and `publicationSanitization` retain this provenance
without relaxing Swagger-only completion or claiming native execution.

### November 2026 published snapshot

The immutable baseline `swagger-arm-20261117-6eeeaa99` completed compilation
and production ARM Swagger validation for 490 projects and 652 Swagger files:
223291 observations, 121 rules **with findings**, and zero compile/validation
failures. Source selection was frozen on November 17; generation completed on
November 18. Consumers still discover the selected version dynamically.

The [version descriptor](https://github.com/msyyc/azure-rest-api-specs/blob/2c35e1f6a7139768b03234983ad201d8fefa4d0b/.lintdiff-baselines/swagger-arm-20261117-6eeeaa99/baseline.json)
and byte-identical `current.json` were published at metadata commit
`2c35e1f6a7139768b03234983ad201d8fefa4d0b`, after downloaded-asset verification.
Their SHA-256 is
`c156564b764eadfddc667a860f6d904dbd5da46843a2f803a0cbc578f4d94b30`.
This is a historical publication receipt, not a consumer default override.

| Identity                    | Value                                                              |
| --------------------------- | ------------------------------------------------------------------ |
| Specs source                | `6eeeaa99a3a7dea8eef4592a6a238fe2c6c129cc`                         |
| Producer candidate          | `42a033215c7512522f4117a71b02dc60b8aff060`                         |
| Candidate core gitlink      | `683031f809a3394a374c21ed587979277f6dd5c7`                         |
| Generator tooling           | `94c56c98244805405ea1b842943274ac37faee46`                         |
| Published baseline identity | `7eebd1aed4f40d8305c29be3ecbf6b4ee4585db2f4b3b1b4fe5c800fac7583d8` |
| Archive SHA-256             | `0331b41caeb28ef10ff3a2d023c96eed14561b357e4179b4fb537969469af20c` |
| Archive bytes               | `53558923`                                                         |

The [release asset](https://github.com/msyyc/azure-rest-api-specs/releases/tag/swagger-lint-baseline-20261117-6eeeaa99)
retains 99960 dataset files. Publication sanitizes 652 copied log/message files;
all retained source and Swagger bytes match the generated originals.
The installed compiler was `1.18.0`, Node `v26.5.0`, validator `2.2.4`,
rulesets `2.2.6`, AutoRest CLI `3.8.0` and AutoRest core `3.10.9`.
The version's `production-report.json` records preparation, failed/interrupted
attempts, the tested project-config correction and validation. Its
`archive-verification.json` records recovery from the uploaded release asset.
Native execution, semantic equivalence, data-plane, RPaaS and staging-only rules
are not assessed. Older staging supplements are not automatically applicable
to this new parent identity.

The previous immutable baseline `swagger-arm-20261026-2cd3c5dd` completed
compilation and Swagger validation for 487 projects and 649 Swagger files:
222905 observations, 121 rules **with findings**, and zero compile/validation
failures. These are historical Swagger results, not native completion. Its
producer candidate was
`726862b537be9fdb24d7e6a4ca868eb9104025dd`, core
`88e5bd18b07d0cbd3bbe92946aff36beaf707b54`, Node `v26.5.0`, with full ARM
`scope: source`. Descriptor checksum/size and publication success must come from
the actual sealed upload, not these documented counts.

## Consume selected observations, then run native

Read the saved full population, `_meta.json`, `validator-results.json`, and the
selected rule's shard when present. The baseline retains all production ARM
observations; selecting a different validator ID alone does not invalidate it.
The index of rules with findings is **not** a registry of all evaluated rules.
If a shard is absent, verify the frozen producer's real production registration,
audience, selector/options and successful execution. Report zero observed
findings only for a proven evaluated rule. Unknown, disabled, staging-only,
data-plane or RPaaS-only rules remain not-evaluated or unsupported, not compliant.
ARM evidence is not proof of all data-plane/RPaaS behavior.

### Staging-only diagnostic supplements

The production baseline stays immutable. Missing staging-only observations are
not evaluated, not zero. A separately authorized producer can evaluate saved
Swagger **without recompiling TypeSpec or regenerating Swagger**, publishing a
new immutable supplement bound to the exact parent `baselineIdentity`.
An authorized supplement does not authorize a new specs snapshot or a
production-baseline refresh.

The supported profile is `arm-staging-spectral`: explicitly enabled
`stagingOnly: true` rules from the installed validator's ARM/common Spectral
registrations. Preserve original selectors, functions, options, resolution and
severity; do not broaden to data-plane, RPaaS or native-engine rules. This is
direct Spectral evaluation, not a claim that AutoRest's staging configuration
was run. Pin and record the actual rulesets/Spectral runtime, producer revision
and lockfile. Compare them with the parent producer's validator before reusing
historical semantic conclusions.

From `packages\typespec-lintdiff`, after verifying the selected baseline:

```powershell
mise exec -- node --import tsx/esm test\harness\staging-supplement.ts `
  --baseline-run C:\dev\baseline-inputs\verified-baseline `
  --output C:\dev\baseline-inputs\new-staging-supplement
```

Omitting `--validator-rule` explicitly selects **all currently registered
ARM/common staging-only Spectral rules**, recorded in the manifest. For an
authorized selected-rule supplement, repeat `--validator-rule <ID>` instead.
Neither path supports a project filter/limit. Estimate and record validator-only
cost/budget before execution; retain unsuccessful attempts, never overwrite
them or silently retry with failing projects excluded.

The producer checks the sealed parent inventory before and after execution.
Reference existence/type checks reuse each just-verified file inventory rather
than repeating filesystem traversal for every reference; no file hashes or
population checks are skipped.
It reads retained Swagger/reference files only, rejects nonlocal/escaping or
symlinked references, and records each input's execution status plus raw
diagnostics. Resolver, format, parsing and thrown-rule failures prevent complete
status and consumption. Every selected rule has a shard, including a successfully
evaluated zero-finding rule; severity totals are computed from observations.
Keep invocation input and reported source document identities separate.

Publish `manifest.json` and `data\**` together as a new immutable supplement,
never inside or appended to the parent dataset. Small sanitized supplements can
be committed on a dedicated specs-fork evidence branch; large supplements use a
new checksummed release asset under the existing evidence contract. Record the
parent identity, supplement manifest content identity, exact rule set, immutable
repository/commit/path or archive size/hash, producer source commit and runtime.
Use a separate discovery descriptor/path; do not add fields to the strict
schema-1 production descriptor or reinterpret its production summary totals.
Publish optional staging discovery at
`.lintdiff-baselines\<baseline-id>\staging\current.json` on the same metadata
branch. A consumer reads it at the **already pinned metadata commit**, checks
the parent identity, profile and selected rules, and records the referenced
immutable supplement repository/commit/path and manifest identity before setup.
An older pinned metadata commit may legitimately have no supplement. That is
missing evaluated staging data, not a zero-finding result or permission to
silently fetch a newer discovery tip. Explicitly select a newer metadata commit
for a new comparison while retaining the unchanged production descriptor.
Verify recovered Git blob bytes or downloaded archive hashes before consumption.
An archive must be safely extracted without escaping paths, links or special
files; the production `shared_baseline.py fetch` command does not download or
extract supplement archives.

Verify a recovered supplement against its verified parent without compiling:

```powershell
mise exec -- node --import tsx/esm test\harness\staging-supplement.ts `
  --baseline-run C:\dev\baseline-inputs\verified-baseline `
  --verify-supplement C:\dev\baseline-inputs\recovered-staging-supplement `
  --validator-rule PatchPropertiesCorrespondToPutProperties
```

Record the returned `supplementIdentity` and compare it with the pinned
publication. The consumer verifies profile/completion, parent/source binding,
full input population, file inventory/hashes, rule shards and severity counts.
Missing required rules, corruption or failed inputs block comparison; they are
not a reason to run the producer automatically.

Pass `--staging-supplement <absolute-supplement-directory>` alongside the usual
`--baseline-run` and explicit `--baseline-policy frozen-reference`. Native
coverage retains production/staging provenance separately, copies and verifies
the supplement separately from the parent, and checks both after execution.
Conflicting production/staging rule observations fail rather than overwrite.
The parent `baseline.json` and production counts are unchanged.

The legacy `specs:staging` script/schema-6 index is local historical evidence,
not a sealed supplement accepted by this path. Do not copy it into a sealed
baseline. A new validator-only evaluation may be combined with unchanged,
content-verified saved native receipts for **saved-observation reanalysis**;
label that separately from a fresh native run. Native changes still require
the full fresh native gate. Retain one-sided sets and both count-gap directions;
neither enabling staging nor equal totals proves semantic equivalence.

Prepare/build the candidate through the existing skill. Use lightweight injected
positive/compliant controls before the full run; skipped controls do not pass.
Then invoke the existing native analyzer with all normal candidate/specs/tarball,
mapping and policy options, adding:

```powershell
--scope source `
--baseline-run C:\dev\baseline-inputs\selected-baseline `
--baseline-policy frozen-reference `
--output C:\dev\coverage-runs\unique-candidate-run
```

Do not add `--filter`/`--limit` to a full-population baseline invocation.
Current reuse does not support filtered replay of a full baseline; a different
scope also changes context. For a justified pilot, request a separate explicit
pilot producer with its own compatible population/context. Never silently
generate filtered Swagger as migration preflight.

Do not combine `--baseline-policy frozen-reference` with
`--baseline-compatibility-receipt`. It retains the historical
Swagger runtime while evaluating the current candidate under the explicit
backward-compatibility assumption. Exact specs source, package manager, selection,
sealed completion, population and inventory/hash checks remain mandatory.
Record the policy and both runtime contexts; the tool leaves equivalence
`not-determined`, so semantic controls and gap investigations must establish the
supported migration conclusion separately.

Only an explicitly selected `strict` comparison requires identical artifacts or
the existing reviewed, content-bound lint-only compatibility receipt. A changed
compiler/emitter/library/dependency closure cannot be certified by that receipt.
Retain failed attempts and use a new analyzer output for an authorized corrected
invocation; policy selection does not grant retries or waive required checks.

`--baseline-run` skips Swagger generation and validator execution, not candidate
injection or native execution. Run native across the full required compatible
population, retain all failures as unassessed, investigate one-sided projects
and both count directions, and preserve semantic controls, independent local
reviews and separate A/B GitHub review checkpoints. Shared data does not prove
equivalence or replace a fresh native run after a relevant rule change.

## Explicit producer refresh

Use the monthly TypeSpec release-cycle policy above. The dedicated producer
resolves and pins fresh candidate/specs refs once per cycle, freezes
source/runtime/compiler/emission/validator/tooling identities, and runs the
Swagger suite. An out-of-cycle producer run still requires explicit
authorization and evidence of material incompatibility or unresolved validity.
Consumer migration workers never refresh the baseline. The existing analyzer
without `--baseline-run` remains available for the producer path. Its native
completion must be reported separately; a sealed Swagger-only artifact cannot
claim native success.

AutoRest resolves its core package through the process-scoped
`autorest_registry` setting, defaulting to `https://registry.npmjs.org`. Do not
assume pnpm's `PNPM_CONFIG_REGISTRY` or npm's registry setting controls this
lookup. When the approved package mirror is required, set `autorest_registry`
for the producer process rather than changing machine-wide configuration.

Before the full run, verify the pinned tools, packed candidate artifacts and
installed specs runtime, then compile and validate a representative project.
Include a `kind: project` configuration when present: the compiler requires a
non-project temporary build config and inherits project features from the
entrypoint's original `tspconfig.yaml`. Do not edit the frozen source config.
The diagnostic probe is not a filtered shared baseline or full-population proof.

Run the producer with durable stdout/stderr logs and record its exact command,
PID, source SHA, concurrency and runtime identities. Keep large logs outside
the conversation and inspect bounded tails for progress. Preserve failed or
interrupted output; use a new output directory for recovery, never a partial
directory as a completed baseline. Validation within a multi-Swagger project
is sequential, and project-level stdout can remain quiet while files finish.
Use the owned process status/CPU and per-file raw-output timestamps to
distinguish healthy progress from a stall; do not restart a healthy producer.
A schema-4 `_meta.json` with `complete: true`
only means generation ended: every project must also have successful compile
and validation status before sealing.

Verify the complete required population, schema/index/shards, source hashes,
failure inventory and all retained dataset file hashes. Seal a separate
schema-2 manifest only after dataset completion, with `status: complete`,
`finishedAt` at completion, `assessmentMode: swagger-baseline`,
`completionScope: swagger-only`, `nativeAssessment: not-run` and the exact
baseline identity. Never edit a still-running full analyzer manifest to imply
native completion.

Preserve the source at its exact SHA. Publish a new immutable version descriptor
and checksummed archive/release in the verified specs fork; retain older assets.
Download and verify the published asset before advancing mutable discovery.
Freshness is this shared producer's responsibility, not each rule worker's.
Record native work, if any, independently from Swagger dataset completion.
