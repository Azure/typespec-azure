# Shared Swagger baseline consumer and producer

Native-first migration consumes a shared sealed Swagger baseline by default.
Legacy migration remains the default queue flow and is unchanged.
Do not regenerate Swagger for each rule or candidate.

## Discover before setup

1. Discover the published baseline in the verified specs fork. The initial
   publication contract is `msyyc/azure-rest-api-specs`,
   branch `evidence/shared-swagger-baseline`. Fetch this branch through the
   caller's verified remote, using `git fetch`, and record its exact commit.
   Read `.lintdiff-baselines\current.json` at that commit, not the worktree's
   moving branch tip. Read and retain the immutable version descriptor at
   `.lintdiff-baselines\swagger-arm-20261026-2cd3c5dd\baseline.json` at the same
   commit. The discovery and version descriptors must agree on baseline identity.
   Treat `current.json` as discovery only; never reread it midway through a task.
2. Save the selected schema-1 descriptor to an absolute local JSON path.
   Record metadata repository/ref/commit, version path and descriptor SHA-256.
   The metadata commit adds discovery files: it is **not** the tested specs SHA.
   The frozen source is `source.commit`, initially
   `2cd3c5dd6d00a5f53214fe594afd2aef3f44d3f9`.
   Recover it from `source.repository` or the recorded preservation repository/ref.
   Verify the source SHA before preparing a clean isolated runtime.
3. Download and verify the baseline with the stdlib helper:

   ```powershell
   mise exec -- python -X utf8 -B C:\dev\worktrees\tooling\.github\skills\analyze-native-lint-coverage\shared_baseline.py fetch `
     --descriptor C:\dev\baseline-inputs\selected-descriptor.json `
     --output C:\dev\baseline-inputs\swagger-arm-20261026-2cd3c5dd
   ```

   Use actual paths. Output must not exist. To operate without network, add
   `--archive C:\dev\baseline-inputs\swagger-arm-20261026-2cd3c5dd.tar.gz`.
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
schemas or compatibility is an exact prerequisite blocker. The helper does not
fetch latest refs, install packages, compile, emit, run validators, refresh data
or retry downloads. Preserve failed evidence and report the required immutable
asset/descriptor/source or explicitly requested producer refresh.

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

The archive repository must be the source preservation repository. The initial
release is `swagger-lint-baseline-20261026-2cd3c5dd`, asset
`swagger-arm-20261026-2cd3c5dd.tar.gz`. Large data are checksummed release assets,
not hundreds of megabytes committed to Git. Archive root contains only
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

The initial dataset completed compilation and Swagger validation for 487 projects
and 649 Swagger files: 222905 observations, 121 rules **with findings**,
zero compile/validation failures. These are historical Swagger results, not
native completion. The producer candidate is
`726862b537be9fdb24d7e6a4ca868eb9104025dd`, core
`88e5bd18b07d0cbd3bbe92946aff36beaf707b54`, Node `v26.5.0`, with full ARM
`scope: source`. Descriptor checksum/size and publication success must come from
the actual sealed upload, not these documented counts.

## Consume selected observations, then run native

Read the saved full population, `_meta.json`, `validator-results.json`, and the
selected rule's shard when present. The baseline retains all production ARM
observations; selecting a different validator ID alone does not invalidate it.
An index of 121 rules with findings is **not** a registry of all evaluated rules.
If a shard is absent, verify the frozen producer's real production registration,
audience, selector/options and successful execution. Report zero observed
findings only for a proven evaluated rule. Unknown, disabled, staging-only,
data-plane or RPaaS-only rules remain not-evaluated or unsupported, not compliant.
ARM evidence is not proof of all data-plane/RPaaS behavior.

Prepare/build the candidate through the existing skill. Use lightweight injected
positive/compliant controls before the full run; skipped controls do not pass.
Then invoke the existing native analyzer with all normal candidate/specs/tarball,
mapping and policy options, adding:

```powershell
--scope source `
--baseline-run C:\dev\baseline-inputs\swagger-arm-20261026-2cd3c5dd `
--output C:\dev\coverage-runs\unique-candidate-run
```

Do not add `--filter`/`--limit` to a full-population baseline invocation.
Current reuse does not support filtered replay of a full baseline; a different
scope also changes context. For a justified pilot, request a separate explicit
pilot producer with its own compatible population/context. Never silently
generate filtered Swagger as migration preflight.

Identical candidate artifacts need no compatibility receipt. Changed lint
artifacts require the existing
`--baseline-compatibility-receipt <absolute-json-path>` with content-bound,
reviewed assertions and an unchanged closure outside the documented lint
allowlist. Same specs SHA is insufficient. A changed compiler, emitter,
metadata, dependencies, runtime, generator or policy can block reuse.
Retain failed compatibility evidence and use a new analyzer output after review.
Do not invent force flags or weaken compatibility to consume this baseline.

`--baseline-run` skips Swagger generation and validator execution, not candidate
injection or native execution. Run native across the full required compatible
population, retain all failures as unassessed, investigate one-sided projects
and both count directions, and preserve semantic controls, independent local
reviews and separate A/B GitHub review checkpoints. Shared data does not prove
equivalence or replace a fresh native run after a relevant rule change.

## Explicit producer refresh

Only a separately requested producer/refresh resolves fresh candidate/specs refs
once, freezes source/runtime/compiler/emission/validator/tooling identities, and
runs the Swagger suite. The existing analyzer without `--baseline-run` remains
available for this producer path. Its native completion must be reported
separately; a sealed Swagger-only artifact cannot claim native success.

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
