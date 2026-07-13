# Upstream-Aware Downstream CI for `typespec-azure`

- **Status:** Design (approved for planning)
- **Date:** 2026-07-13
- **Issue:** [Azure/typespec-azure#4860](https://github.com/Azure/typespec-azure/issues/4860)
- **Author:** @msyyc (brainstormed with Copilot CLI)

## Problem

More language emitters (and shared libraries) now live inside `typespec-azure`,
making it a true mono-repo. A change to an **upstream** dependency — the compiler
/ core libraries (vendored via the `core/` git submodule) or an in-repo package
such as `typespec-client-generator-core` — can regress a **downstream** consumer
(a language emitter or another library) that lives in the same repo.

Today there is **no mechanism** that runs the downstream checks when only an
upstream dependency changes:

- The emitter workflows (`ci-python.yml`, `ci-java.yml`, `ci-typescript.yml`)
  gate themselves with `on.pull_request.paths` scoped mostly to their own
  package directory.
- `ci-python.yml` / `ci-java.yml` do **not** list any upstream dependency in
  their `paths`. `ci-typescript.yml` lists a few (tcgc, azure-resource-manager)
  but this is hand-maintained and easy to let drift.
- A `core/` **submodule bump** is a single gitlink change; `paths` filters
  cannot see *inside* the submodule, so no emitter workflow triggers on it.

The result: an upstream-only change can merge with **no downstream emitter check
running at all**, and regressions surface much later.

## Goals

- When CI detects an upstream change, automatically run the checks of the
  **affected** downstream targets (emitters and libraries).
- Avoid running everything on every change (folder-level granularity where
  practical) to keep CI time reasonable.
- Make it **convenient to add a new downstream library** to the system.
- Introduce this without destabilizing the existing CI, **especially the merge
  queue** and current required status checks.

## Non-Goals

- No automated drift detection between the config and real `package.json`
  dependencies. Correctness of the map is guarded by PR review only (accepted
  residual risk — see "Risks").
- No skip label / manual override for downstream CI. Affected-detection is the only
  lever.
- No change to the existing `core` `ci.yml` workflow or its required checks.
- No fine-grained detection for *which folder inside* the `core/` submodule
  changed — any submodule bump is treated coarsely (see below).

## Approach

Chosen approach (over the two alternatives — per-emitter curated `paths` lists,
or fully dynamic turbo dependency-graph resolution): a **static, reviewable
dependency-map config** consumed by an **always-on entrypoint dispatcher**, with
a **single aggregating gate** used as the required status check.

Rationale: upstream dependencies change rarely, so an explicit config is easier
to reason about and review than dynamic graph magic; an always-on entrypoint +
gate is the pattern the upstream `typespec` repo already uses (`.github/
workflows/ci.yml` → `changes` job → conditional reusable workflows → `ci-gate`)
and it plays correctly with branch protection and the merge queue.

### Component 1 — Dependency map config

New file: `eng/ci/downstream-deps.yml`.

A **generic dependency → target map**. "Targets" are any downstream package —
language emitters *and* libraries such as `typespec-autorest` or
`typespec-client-generator-core` (which is downstream of the compiler but
upstream of the emitters).

Shared dependencies are defined **once** in `groups` and referenced by targets,
so a new common dependency is added in a single place rather than duplicated
across every target.

```yaml
# Ignore globs applied to every dependency match unless a target overrides them.
# A change that touches ONLY these paths does not trigger downstream checks.
defaults:
  ignore:
    - "**/test/**"
    - "**/*.md"
    - "**/CHANGELOG.md"

# Reusable dependency groups — each shared dependency list is defined once.
groups:
  core-libs:
    - "packages/typespec-client-generator-core/**"
    - "packages/typespec-azure-core/**"
    - "packages/typespec-azure-resource-manager/**"
  compiler-core:
    # in-repo packages that wrap / re-export the compiler surface, if any
    - "packages/typespec-azure-core/**"

# Downstream targets. Adding a lib = one entry here (+ a reusable workflow +
# one entrypoint job stanza; see Component 2).
targets:
  typespec-python:
    self: "packages/typespec-python/**"
    use: [core-libs]
    core-submodule: true
  typespec-java:
    self: "packages/typespec-java/**"
    use: [core-libs]
    core-submodule: true
  typespec-ts:
    self: "packages/typespec-ts/**"
    use: [core-libs]
    core-submodule: true
  typespec-autorest:
    self: "packages/typespec-autorest/**"
    use: [core-libs]
    core-submodule: true
  typespec-client-generator-core:
    self: "packages/typespec-client-generator-core/**"
    use: [compiler-core]
    core-submodule: true
```

Per-target keys:

- `self` — the target's own package globs (always part of its trigger set).
- `use` — list of `groups` to include (shared upstream deps).
- `extra` *(optional)* — target-specific extra dependency globs.
- `ignore` *(optional)* — overrides/extends `defaults.ignore` for this target.
- `core-submodule` *(bool)* — whether a `core/` submodule bump affects this
  target (coarse; see Detection).

The **effective trigger set** for a target is
`self ∪ (expanded use groups) ∪ extra`, with the ignore globs applied as
negations.

### Component 2 — Downstream entrypoint workflow

New file: `.github/workflows/ci-downstream.yml`. Always runs (no `on.paths`):

```yaml
on:
  pull_request:
    branches: [main, "release/*"]
  merge_group:
```

Jobs:

1. **`detect-affected`** — reads `eng/ci/downstream-deps.yml`, computes the set of
   changed files for the current event (see Detection), and emits **one boolean
   output per target** (`python`, `java`, `typescript`, `autorest`, `tcgc`, …).

2. **One job per target**, e.g.:

   ```yaml
   python:
     needs: detect-affected
     if: needs.detect-affected.outputs.python == 'true'
     uses: ./.github/workflows/ci-python.yml
   ```

   The existing `ci-python.yml` / `ci-java.yml` / `ci-typescript.yml` are
   converted from `on: pull_request/merge_group` to `on: workflow_call`. Their
   internal jobs (build / test / typecheck / lint / docs) are unchanged — this
   preserves each emitter's rich, parallel multi-job suite ("as many jobs as
   necessary to run in reasonable time").

3. **`downstream-ci-gate`** — always runs; it is the **single required status
   check** for downstream targets. It fails if any dispatched target failed or
   was cancelled, and passes when every target either passed or was skipped
   (unaffected target = pass). Pattern mirrors the upstream `typespec` repo
   `ci-gate` job.

> **Dispatch model (decided):** each target is a statically-declared reusable
> workflow job (GitHub cannot pick a reusable workflow dynamically). Adding a new
> downstream lib therefore requires three edits: (1) a `targets` entry in the
> config, (2) a reusable `ci-<target>.yml` workflow, (3) a job stanza in
> `ci-downstream.yml`. This was chosen over a config-only matrix dispatcher to keep
> rich, attributable per-target check UI and intra-target job parallelism.

### Component 3 — Detection logic

Implemented as a script invoked by `detect-affected` (e.g.
`eng/ci/detect-affected.mjs`).

- **Changed-file base is event-aware (critical for the merge queue):**
  - `pull_request`: diff `github.event.pull_request.base.sha` → head.
  - `merge_group`: diff `github.event.merge_group.base_sha` → head.
  Using the wrong base silently over- or under-triggers in the queue.
- **In-repo deps:** folder-granular. A file is "relevant" to a target if it
  matches the target's effective trigger set and does **not** match its ignore
  globs. So a change touching only `packages/typespec-client-generator-core/
  test/**` yields `python=false` and the Python emitter is skipped.
  Implementable with `dorny/paths-filter` using `predicate-quantifier: "every"`
  plus `!`-negations (the exact mechanism already used in the upstream
  `typespec` `ci.yml` `changes` job) or with an equivalent glob check in script.
- **`core/` submodule bump:** coarse. If the `core` gitlink changed at all,
  every target with `core-submodule: true` is marked affected. (Fine-grained
  submodule diffing is explicitly out of scope; submodule bumps are infrequent.)

## Merge-queue and CI-system impact

This change deliberately touches the merge queue, so the following are treated
as hard requirements:

1. **Trigger flip.** Converting emitter workflows to `workflow_call` removes
   their own `pull_request` / `merge_group` triggers. In the queue they will now
   run **only when affected**, instead of always (current behavior, because
   `merge_group` ignores `paths`). The queue therefore depends on
   `detect-affected` correctness — hence the event-aware diff base above.

2. **No double runs (critical).** An emitter workflow must never both
   self-trigger *and* be invoked via `workflow_call` at the same time — in the
   merge queue that fires it **twice** (once from its own `merge_group` trigger,
   once from the entrypoint's `uses:`). The end state removes each emitter's
   `pull_request` / `merge_group` triggers entirely so it runs **only** via the
   entrypoint. The migration (see Rollout) is sequenced so this dual-trigger
   window never exists. Note `core` `ci.yml` does **not** run any emitter suite
   (its `autorest-checks` job runs `gen-sdk` on samples, which is unrelated), so
   it introduces no overlap.

3. **Required-check migration ordering (footgun).** Once emitter workflows are
   reusable, their checks report under the caller (e.g.
   `ci-downstream / python / Build`), not their old standalone names. If branch
   protection still lists the old names as required, the queue waits forever for
   checks that never post again and is **permanently blocked**. This is resolved
   by the admin-coordinated migration in Rollout: the required-check set is
   swapped (old emitter names removed, `downstream-ci-gate` added) in the same
   window the trigger flip lands. `downstream-ci-gate` runs on both
   `pull_request` and `merge_group`, satisfying GitHub's rule that the queue and
   PR produce the same required checks.

4. **`core` `ci.yml` is untouched.** It already runs unconditionally (no
   `paths`) and keeps its current required checks, minimizing blast radius. The
   emitter gate is an **additional** required check, not a replacement.

5. **Concurrency.** The entrypoint declares its own
   `concurrency: { group: ${{ github.workflow }}-${{ github.ref }},
   cancel-in-progress: true }`, matching existing workflows; reusable workflows
   inherit the run context.

## Risks & mitigations

- **Config drift** (a new upstream dep not added to the map re-opens the exact
  gap this solves). Accepted; mitigated by PR review only, per decision. Reviewer
  guidance should live next to the config.
- **Detection base bugs in the queue.** Mitigated by an explicit event-aware base
  and by validating on a test PR + a merge-queue dry run before flipping required
  checks.
- **Coarse submodule detection** may run all emitters for a submodule bump even
  when only unrelated core folders changed. Accepted; submodule bumps are rare.

## Rollout

Chosen strategy: **admin-coordinated single flip with zero double-runs**. The
trigger conversion and the branch-protection required-check swap happen in the
same coordinated window, so no dual-trigger (double-run) window and no
required-check gap ever exists.

1. **Prep PR (additive, no behavior change to required set).** Add
   `eng/ci/downstream-deps.yml`, `eng/ci/detect-affected.mjs`, and
   `.github/workflows/ci-downstream.yml` (entrypoint + `downstream-ci-gate`).
   In this PR the entrypoint's per-target jobs invoke the emitter workflows via
   `workflow_call`, and the emitter workflows are converted to
   `on: workflow_call` **only** (self-triggers removed). Because the old
   standalone emitter checks are not yet used for anything gating here, validate
   thoroughly on this PR itself:
   - an upstream-only change triggers exactly the affected targets;
   - a test-only / docs-only upstream change triggers none;
   - a `core/` submodule bump triggers all `core-submodule: true` targets;
   - confirm each emitter runs exactly **once** (no duplicate runs).
2. **Merge-queue dry run.** Exercise the queue with the branch to confirm
   `detect-affected` uses `merge_group.base_sha` correctly and the gate reports.
3. **Admin required-check swap (same window as merge).** A repo admin updates
   branch protection: remove the old standalone emitter check names and add
   `downstream-ci-gate` as required. Because emitters are already
   `workflow_call`-only, no old emitter check name is ever simultaneously
   required-and-absent long enough to lock the queue.
4. **Post-merge verification.** Confirm on `main` that PRs touching only an
   upstream dep now run the affected downstream checks and that the queue is
   healthy.

## Open items for the implementation plan

- Exact package globs for each `group` (audit real `package.json`
  `dependencies`/`devDependencies` of each target).
- Whether detection uses `dorny/paths-filter` directly or a small custom script
  (the submodule + event-aware base logic may be cleaner in script).
- Final list of initial `targets` (which libs beyond the three language emitters
  to onboard first).
