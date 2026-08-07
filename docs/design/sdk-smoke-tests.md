# SDK Smoke Tests for Generated Code Validation — Design

- **Issue:** [Azure/typespec-azure#4720](https://github.com/Azure/typespec-azure/issues/4720)
- **Date:** 2026-07-08
- **Status:** Approved design (pending spec review)
- **Scope of this design:** A concrete Python pilot with a language-agnostic
  architecture so other emitters (`typespec-ts`, `typespec-java`, …) can adopt
  it without reworking the shared pieces.

## Problem

Today, generated-code validation relies mainly on Spector tests, which check
payload/API-behavior correctness but give weak coverage of the *generated SDK
source code*. Small upstream changes in TypeSpec, TCGC, emitters, or shared
codegen tooling can silently alter generated SDK output, and there is no fast
feedback signal for emitter developers or AI-assisted/automated changes.

We want a lightweight smoke-test framework that regenerates a small set of
representative real services whenever upstream changes occur, and surfaces the
resulting SDK code differences as concrete, reviewable diffs.

## Goals

- Detect unintended generated-SDK-code changes early, in the PR that causes them.
- Cover major generation scenarios (ARM, data-plane, LRO, paging,
  discriminators/polymorphism, versioning, large/complex models).
- Reuse the existing `regenerate` machinery for speed and correctness.
- Keep the config and fetch layer language-agnostic so every emitter can adopt
  the same source of truth.

## Non-Goals

- Replacing Spector payload tests.
- Building a fuzzy "semantic diff" engine (see Command 2).
- CI triggering (when/where the commands run on PRs and on schedule) — tracked
  in a separate issue.
- A cross-repo asset/snapshot store (may be revisited later; out of scope for
  the pilot).

## Chosen Approach (A): Shared config + per-emitter snapshot in the monorepo

Config and fetch live once at the repo root; only the generate→snapshot adapter
is per-language. This reuses the proven `regenerate` pipeline and keeps each
emitter fully decoupled, giving the Python pilot the fastest path to value while
leaving room for a central orchestrator or external asset repo later.

### 1. Shared config & service selection

A single language-agnostic file, `smoke-test/smoke-test-config.json`, owned by
all emitter teams:

```jsonc
{
  "specRepo": "Azure/azure-rest-api-specs",
  "commit": "ea850a065dc8679f82dc3fdbba9ceff53eeba116", // one pin for ALL services
  "services": [
    {
      "name": "compute-resource-manager",
      "specPath": "specification/compute/resource-manager/Microsoft.Compute/Compute",
      "scenarios": ["arm", "lro", "paging", "discriminator", "large-models"]
    }
    // ~5 entries total, chosen to cover major generation paths
  ]
}
```

- **One pinned commit for the whole set** → bumping the baseline is a one-line
  change producing a single reviewable PR.
- `name` becomes the snapshot folder name.
- `scenarios` is coverage metadata: lets us assert (and document) that the
  selected set exercises the major generation paths.
- A short `smoke-test/README.md` records the "why these services" selection
  criteria.
- **First service:** Compute (`Microsoft.Compute`), a large ARM service that
  stresses LRO, paging, discriminators, and big model graphs.

### 2. Fetch step (shared)

`smoke-test/fetch-specs.mjs`, called by every emitter before generating:

1. Reads `smoke-test-config.json`.
2. Performs a **sparse, shallow checkout** of `Azure/azure-rest-api-specs` at
   the pinned `commit`, pulling only the listed `specPath`s plus shared
   dependencies (e.g. `specification/common-types`) into a git-ignored cache
   dir: `smoke-test/.specs-cache/<commit>/`.
3. Caches by commit SHA so repeated local runs and CI jobs across emitters do
   not re-clone.
4. Emits a resolved manifest mapping each service → local tsp entrypoint +
   `tspconfig.yaml` presence, consumed by each emitter's generate step.

Sparse checkout at a single commit preserves each service's `tspconfig.yaml`,
`examples/`, and cross-service imports consistently. The cache dir is
`.gitignore`d; only generated snapshots are committed.

### 3. Layout: shared common script + per-emitter snapshot

The language-agnostic pieces live once at the repo root and are called by every
emitter; only generation is per-language.

```
smoke-test/
  smoke-test-config.json        # shared config (§1)
  smoke-test-common.ts          # SHARED cross-emitter script (§4 Common)
  README.md                     # selection criteria + how-to
  .specs-cache/<commit>/        # git-ignored fetched specs (§2)

packages/typespec-python/
  eng/scripts/ci/regenerate-smoke.ts   # Python command (§4 Command 1)
  smoke-test/generated/
    compute-resource-manager/          # committed baseline snapshot
    <service-2>/ ...
```

- **Python:** reuse the two-phase `regenerate` pipeline (tsp compile → per-spec
  YAML → batched Python emit), pointed at the fetched real-service entrypoints
  instead of azure-http-specs cases.
- The generate step honors each service's own `tspconfig.yaml` emitter options
  where present, so output matches the real SDK pipeline.
- Snapshots are formatted/linted with the same rules used today, so diffs stay
  semantic rather than cosmetic.
- Because config, fetch, and diff-check are all in the shared
  `smoke-test-common.ts`, adding `typespec-ts`/`typespec-java` later means only
  writing their own `regenerate-smoke.ts` + `smoke-test/generated/` — zero
  changes to shared code.

### 4. Commands

**CI triggering (when/where these run) is out of scope and tracked in a separate
issue** — this design only defines the commands and the shared script they call.

#### Common (shared, all emitters): `smoke-test/smoke-test-common.ts`

A single language-agnostic script that every emitter calls, so the non-language
logic is written once. It exposes:

- `loadConfig()` — parse and validate `smoke-test/smoke-test-config.json`.
- `fetchSpecs(config)` — sparse, shallow checkout of the pinned commit into
  `smoke-test/.specs-cache/<commit>/`; returns the resolved manifest (per
  service → local tsp entrypoint + `tspconfig.yaml` presence). Commit-keyed
  cache, so repeated/cross-emitter runs don't re-clone.
- `checkDiff(snapshotDir)` — the diff-check step: runs `git diff --exit-code`
  scoped to the emitter's snapshot dir (delegating to / mirroring the existing
  `eng/scripts/check-for-changed-files.js` behavior), printing the diff and
  exiting non-zero on any drift.

New languages adopt smoke tests by calling these three helpers from their own
`regenerate-smoke.ts`; they never reimplement config parsing, fetching, or
diffing.

#### Command 1 — Python generate (new): `regenerate-smoke.ts`

A new script `packages/typespec-python/eng/scripts/ci/regenerate-smoke.ts`
(exposed as an npm script, e.g. `regenerate:smoke`) that:

1. Calls the common `loadConfig()` + `fetchSpecs()` to get the fetched
   real-service entrypoints.
2. Drives the **existing** two-phase regenerate machinery
   (`regenerate-common.ts`) with those entrypoints as input and
   `packages/typespec-python/smoke-test/generated/<service>/` as output.
3. Reuses the proven helpers (`buildTaskGroups`, `runParallel`,
   `prepareBaselineOfGeneratedCode`, formatting/lint) — the only new logic is
   "config + fetched specs → point regenerate at these specs / this output
   folder." Flags mirror `regenerate` (`--name`, `--debug`, `--jobs`), plus an
   optional `--check` that calls the common `checkDiff()` after generating.

#### Command 2 — diff check

`regenerate-smoke.ts --check` (or CI running `regenerate-smoke.ts` then the
shared `checkDiff` / existing `check-for-changed-files.js`). Because snapshots
under `smoke-test/generated/` are committed, the check is simply: regenerate,
then fail if `git diff` is non-empty. No fuzzy/semantic diffing.

- **Contract:** committed snapshot must equal freshly generated output; any
  difference fails, so every generated-code change is reviewed in the PR that
  causes it — identical to today's `regenerate` + `check-for-changed-files`
  pattern.
- **"Meaningful diff" handling:** volatile bits (version stamps, timestamps) are
  kept *out* of snapshots (as `regenerate` already does) rather than filtered by
  a fuzzy diff — this keeps the signal fully trustworthy.

### 5. Updating the baseline

- Running `regenerate-smoke.ts` rewrites the snapshots in place; commit the
  result to accept the new baseline.
- Bumping to newer upstream specs = change `commit` in the config, run
  `regenerate-smoke.ts`, commit. One PR shows the full cross-cutting SDK impact
  of the bump.

### 6. Validating the framework itself

- **Unit tests:** config parser and fetch/manifest resolver (valid config,
  missing `specPath`, cache hit/miss).
- **End-to-end fixture:** a tiny local fixture service proves
  generate→snapshot→diff without cloning the real spec repo.

## Rollout

1. Land the shared `smoke-test-common.ts` (config + fetch + diff) and the Python
   `regenerate-smoke.ts` command with the initial services (Compute first; grow
   to ~5 covering the scenario matrix).
2. Commit the initial snapshots; the diff-check runs via
   `regenerate-smoke.ts --check` / the shared `checkDiff`.
3. Document "how to add a service" and "how to bump the commit."
4. File follow-up issues for `typespec-ts` / `typespec-java` to add their own
   `regenerate-smoke.ts` + `smoke-test/generated/` against the same shared
   `smoke-test-common.ts`.

**Out of scope (tracked separately):** CI triggering — deciding when/where the
generate + diff-check commands run on PRs and on a schedule.

## Alternatives Considered

- **B. Central orchestrator + language plugins:** cleaner cross-language
  reporting and a single diff filter, but requires a new orchestration layer and
  plugin contract before Python sees value. Deferred; Approach A's shared
  config/fetch is designed so B can layer on later.
- **C. External asset/snapshot repo:** keeps the monorepo lean and matches the
  ongoing "asset repo" investigation, but adds cross-repo auth/sync complexity
  and slower feedback. Premature for a pilot.

## Open Questions

- Final list of the remaining ~4 services to complete the scenario matrix
  (data-plane, versioning, pure-discriminator, etc.).
- Whether Compute's full snapshot size is acceptable in-repo, or whether a
  representative subset of its operations should be generated.
