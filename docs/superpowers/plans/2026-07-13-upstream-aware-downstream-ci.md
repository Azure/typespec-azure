# Upstream-Aware Downstream CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `typespec-azure` run the affected downstream package checks (language emitters + libs) when an upstream dependency changes, including `core/` submodule bumps, via a static dependency-map config, an always-on entrypoint dispatcher, and a single `downstream-ci-gate` required check.

**Architecture:** A committed config (`eng/ci/downstream-deps.yml`) maps each downstream target to its upstream triggers (own package globs, shared dependency `groups`, and a `core-submodule` flag). A small Node script (`eng/scripts/detect-affected.js`) diffs the PR/merge-group against its base, applies folder-granular include/ignore globs (coarse for the `core` submodule), and emits one boolean output per target. A new always-on workflow (`.github/workflows/ci-downstream.yml`) reads those outputs and conditionally invokes each emitter's existing workflow (converted to `on: workflow_call`), then a `downstream-ci-gate` job aggregates results as the single required status check. The `core` `ci.yml` workflow is left untouched.

**Tech Stack:** GitHub Actions (reusable workflows, `merge_group`), Node.js (ESM), `js-yaml`, `minimatch`, node's built-in `node:test` runner.

**Design spec:** `docs/superpowers/specs/2026-07-13-upstream-aware-downstream-ci-design.md`

---

## Important implementation notes (read first)

- **Target names must be expression-safe.** GitHub Actions expressions parse `needs.detect-affected.outputs.typespec-python` as `typespec` **minus** `python`. So target **keys** in the config are short ids (`python`, `java`, `typescript`); the package path lives in the target's `self` glob. (This refines the illustrative `typespec-python` keys used in the spec.)
- **Submodule detection is coarse and cheap.** `git diff --name-only <base> <head>` lists the literal path `core` when the submodule gitlink moves. Detecting "the string `core` is in the changed-file list" is sufficient — no need to diff inside the submodule.
- **Over-triggering is safe; under-triggering is the danger.** When unsure whether an upstream package is a real dependency, include it. The `groups` list is deliberately generous.
- **Rollout uses Strategy A** (admin-coordinated single flip, zero double-runs). Emitter workflows are converted to `workflow_call`-only in the same PR that adds the entrypoint, and a repo admin swaps required checks in the same window. See Task 7.

---

## File structure

- Create: `eng/ci/downstream-deps.yml` — the dependency-map config (Task 1).
- Modify: `eng/scripts/package.json` — add `minimatch` dependency (Task 2).
- Create: `eng/scripts/detect-affected.js` — detection logic + CLI (Task 2/3).
- Create: `eng/scripts/detect-affected.test.js` — unit tests via `node:test` (Task 2).
- Modify: `.github/workflows/ci-python.yml` — convert to `on: workflow_call` (Task 4).
- Modify: `.github/workflows/ci-java.yml` — convert to `on: workflow_call` (Task 4).
- Modify: `.github/workflows/ci-typescript.yml` — convert to `on: workflow_call` (Task 4).
- Create: `.github/workflows/ci-downstream.yml` — entrypoint + gate (Task 5).

---

### Task 1: Dependency-map config

**Files:**
- Create: `eng/ci/downstream-deps.yml`

- [ ] **Step 1: Create the config file**

Create `eng/ci/downstream-deps.yml` with the following content. Target keys are
short, expression-safe ids. The `groups` block holds shared upstream
dependencies defined once.

```yaml
# Dependency map for upstream-aware downstream CI.
# Consumed by eng/scripts/detect-affected.js and .github/workflows/ci-downstream.yml.
#
# HOW TO ADD A NEW DOWNSTREAM TARGET (e.g. typespec-autorest):
#   1. Add an entry under `targets:` here (short expression-safe id as the key).
#   2. Add a reusable `.github/workflows/ci-<id>.yml` (on: workflow_call).
#   3. Add a job + a gate `needs:` entry in .github/workflows/ci-downstream.yml,
#      and add the id to the detect-affected `outputs:` map.
#
# NOTE: there is intentionally NO automated drift check. Keeping this map correct
# is a PR-review responsibility. When unsure, include the dependency (over-
# triggering is safe; under-triggering silently misses regressions).

# Ignore globs applied to every dependency match unless a target overrides them.
# A change touching ONLY these paths does not trigger downstream checks.
defaults:
  ignore:
    - "**/test/**"
    - "**/*.md"
    - "**/CHANGELOG.md"

# Reusable dependency groups: each shared upstream dependency list is defined once.
groups:
  core-libs:
    - "packages/typespec-client-generator-core/**"
    - "packages/typespec-azure-core/**"
    - "packages/typespec-azure-resource-manager/**"
  # Shared CI infrastructure every target's jobs consume.
  shared-ci:
    - ".github/actions/setup/**"

# Downstream targets. Key = short expression-safe id used for the job output.
targets:
  python:
    self: "packages/typespec-python/**"
    use: [core-libs, shared-ci]
    extra:
      - ".github/workflows/ci-python.yml"
      - ".github/actions/setup-python/**"
    core-submodule: true
  java:
    self: "packages/typespec-java/**"
    use: [core-libs, shared-ci]
    extra:
      - ".github/workflows/ci-java.yml"
      - ".github/actions/setup-java/**"
    core-submodule: true
  typescript:
    self: "packages/typespec-ts/**"
    use: [core-libs, shared-ci]
    extra:
      - ".github/workflows/ci-typescript.yml"
    core-submodule: true
```

> **Why `extra` + `shared-ci`:** the original emitter workflows self-triggered
> not only on their package glob but also on their own workflow file and their
> `setup-<lang>` composite action. Preserving that (so a change to
> `.github/actions/setup-python/**` or the reusable workflow still runs the
> emitter) is required to avoid an under-trigger regression.

- [ ] **Step 2: Verify it parses as YAML (after Task 2 installs js-yaml)**

Run from `eng/scripts`:
`node --input-type=module -e "import {load} from 'js-yaml'; import {readFileSync} from 'node:fs'; console.log(Object.keys(load(readFileSync('../ci/downstream-deps.yml','utf8')).targets))"`
Expected: prints `[ 'python', 'java', 'typescript' ]`.

> If Task 2 has not run yet, defer this verification until `js-yaml` is
> installed in `eng/scripts` (it is already a declared dependency there).

- [ ] **Step 3: Commit**

```bash
git add eng/ci/downstream-deps.yml
git commit -m "feat(ci): add downstream dependency-map config"
```

---

### Task 2: Detection logic (TDD)

**Files:**
- Modify: `eng/scripts/package.json`
- Create: `eng/scripts/detect-affected.js`
- Test: `eng/scripts/detect-affected.test.js`

- [ ] **Step 1: Add the `minimatch` dependency**

Edit `eng/scripts/package.json` to add `minimatch` (keep existing `js-yaml`):

```json
{
  "type": "module",
  "dependencies": {
    "autorest": "^3.4.2",
    "js-yaml": "^4.1.0",
    "minimatch": "^9.0.5"
  }
}
```

- [ ] **Step 2: Install deps**

Run: `cd eng/scripts && npm install`
Expected: installs without error; `eng/scripts/node_modules/minimatch` exists.

- [ ] **Step 3: Write the failing test**

Create `eng/scripts/detect-affected.test.js`:

```js
// @ts-check
import test from "node:test";
import assert from "node:assert/strict";
import { computeAffected, resolveTarget } from "./detect-affected.js";

/** @type {import("./detect-affected.js").Config} */
const config = {
  defaults: { ignore: ["**/test/**", "**/*.md", "**/CHANGELOG.md"] },
  groups: { "core-libs": ["packages/typespec-client-generator-core/**"] },
  targets: {
    python: { self: "packages/typespec-python/**", use: ["core-libs"], "core-submodule": true },
    java: { self: "packages/typespec-java/**", "core-submodule": false },
  },
};

test("self change affects only that target", () => {
  const r = computeAffected(["packages/typespec-python/src/index.ts"], config);
  assert.equal(r.python, true);
  assert.equal(r.java, false);
});

test("upstream group change affects dependents", () => {
  const r = computeAffected(["packages/typespec-client-generator-core/src/x.ts"], config);
  assert.equal(r.python, true);
});

test("test-only upstream change is ignored", () => {
  const r = computeAffected(
    ["packages/typespec-client-generator-core/test/x.test.ts"],
    config,
  );
  assert.equal(r.python, false);
});

test("docs-only upstream change is ignored", () => {
  const r = computeAffected(["packages/typespec-client-generator-core/README.md"], config);
  assert.equal(r.python, false);
});

test("core submodule bump affects only core-submodule targets", () => {
  const r = computeAffected(["core"], config);
  assert.equal(r.python, true);
  assert.equal(r.java, false);
});

test("unrelated change affects nothing", () => {
  const r = computeAffected(["README.md"], config);
  assert.equal(r.python, false);
  assert.equal(r.java, false);
});

test("resolveTarget throws on unknown group", () => {
  const bad = /** @type {any} */ ({
    groups: {},
    targets: { x: { self: "a/**", use: ["nope"] } },
  });
  assert.throws(() => resolveTarget(bad, "x"), /unknown group "nope"/);
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd eng/scripts && node --test detect-affected.test.js`
Expected: FAIL — `Cannot find module './detect-affected.js'` (or similar import error).

- [ ] **Step 5: Write the minimal implementation**

Create `eng/scripts/detect-affected.js`:

```js
// @ts-check
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import { minimatch } from "minimatch";

/** The git path that changes when the `core` submodule pointer moves. */
const SUBMODULE_PATH = "core";

/**
 * @typedef {Object} Target
 * @property {string} [self]
 * @property {string[]} [use]
 * @property {string[]} [extra]
 * @property {string[]} [ignore]
 * @property {boolean} ["core-submodule"]
 *
 * @typedef {Object} Config
 * @property {{ ignore?: string[] }} [defaults]
 * @property {Record<string, string[]>} [groups]
 * @property {Record<string, Target>} targets
 */

/**
 * Resolve a target's effective trigger + ignore globs.
 * @param {Config} config
 * @param {string} name
 * @returns {{ triggers: string[], ignore: string[], coreSubmodule: boolean }}
 */
export function resolveTarget(config, name) {
  const target = config.targets[name];
  const groups = config.groups ?? {};
  const triggers = [];
  if (target.self) triggers.push(target.self);
  for (const groupName of target.use ?? []) {
    const globs = groups[groupName];
    if (!globs) {
      throw new Error(`Target "${name}" references unknown group "${groupName}"`);
    }
    triggers.push(...globs);
  }
  triggers.push(...(target.extra ?? []));
  const ignore = target.ignore ?? config.defaults?.ignore ?? [];
  return { triggers, ignore, coreSubmodule: target["core-submodule"] === true };
}

/**
 * Compute which targets are affected by a set of changed files.
 * @param {string[]} changedFiles
 * @param {Config} config
 * @returns {Record<string, boolean>}
 */
export function computeAffected(changedFiles, config) {
  const submoduleChanged = changedFiles.includes(SUBMODULE_PATH);
  /** @type {Record<string, boolean>} */
  const result = {};
  for (const name of Object.keys(config.targets)) {
    const { triggers, ignore, coreSubmodule } = resolveTarget(config, name);
    let affected = coreSubmodule && submoduleChanged;
    if (!affected) {
      affected = changedFiles.some(
        (file) =>
          triggers.some((glob) => minimatch(file, glob, { dot: true })) &&
          !ignore.some((glob) => minimatch(file, glob, { dot: true })),
      );
    }
    result[name] = affected;
  }
  return result;
}

/**
 * @param {string} path
 * @returns {Config}
 */
export function loadConfig(path) {
  return /** @type {Config} */ (load(readFileSync(path, "utf8")));
}

/**
 * @param {string} base
 * @param {string} head
 * @returns {string[]}
 */
function getChangedFiles(base, head) {
  const out = execFileSync("git", ["diff", "--name-only", base, head], {
    encoding: "utf8",
  });
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// CLI entry: run only when executed directly (not when imported by tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA || "HEAD";
  if (!base) {
    console.error("ERROR: BASE_SHA env var is required");
    process.exit(1);
  }
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const configPath = join(scriptDir, "..", "ci", "downstream-deps.yml");
  const config = loadConfig(configPath);
  const changedFiles = getChangedFiles(base, head);
  const affected = computeAffected(changedFiles, config);

  console.log(`Base: ${base}`);
  console.log(`Head: ${head}`);
  console.log(`Changed files (${changedFiles.length}):`);
  for (const f of changedFiles) console.log(`  ${f}`);
  console.log("Affected targets:", JSON.stringify(affected));

  const outPath = process.env.GITHUB_OUTPUT;
  if (outPath) {
    const lines =
      Object.entries(affected)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n") + "\n";
    appendFileSync(outPath, lines);
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd eng/scripts && node --test detect-affected.test.js`
Expected: PASS — all 7 tests pass.

- [ ] **Step 7: Commit**

```bash
git add eng/scripts/package.json eng/scripts/detect-affected.js eng/scripts/detect-affected.test.js
git commit -m "feat(ci): add detect-affected script for downstream targets"
```

> If `npm install` produced an `eng/scripts/package-lock.json`, add it to the
> commit too.

---

### Task 3: Verify the CLI end-to-end locally

**Files:** none (verification only)

- [ ] **Step 1: Simulate a no-change diff**

Run (from repo root, bash / pwsh):
```bash
BASE_SHA=$(git rev-parse HEAD) HEAD_SHA=HEAD node eng/scripts/detect-affected.js
```
Expected: prints `Affected targets: {"python":false,"java":false,"typescript":false}`.

> PowerShell equivalent:
> `$env:BASE_SHA=(git rev-parse HEAD); $env:HEAD_SHA="HEAD"; node eng/scripts/detect-affected.js`

- [ ] **Step 2: Simulate a real diff against the previous commit**

Run:
```bash
git diff --name-only HEAD~1 HEAD   # inspect the real diff first
BASE_SHA=HEAD~1 HEAD_SHA=HEAD node eng/scripts/detect-affected.js
```
Expected: prints the changed files and a plausible affected map (a target is
`true` only when one of its trigger globs matched a non-ignored changed file).
No crash.

> This task has no commit — it validates the script before wiring CI.

---

### Task 4: Convert emitter workflows to reusable (`on: workflow_call`)

**Files:**
- Modify: `.github/workflows/ci-python.yml` (the top `on:` block)
- Modify: `.github/workflows/ci-java.yml` (the top `on:` block)
- Modify: `.github/workflows/ci-typescript.yml` (the top `on:` block)

- [ ] **Step 1: Convert `ci-python.yml` trigger**

Replace the `on:` block. Change:

```yaml
on:
  pull_request:
    branches:
      - main
      - release/*
    paths:
      - "packages/typespec-python/**"
      - ".github/workflows/ci-python.yml"
      - ".github/actions/setup-python/**"
  merge_group:
```

to:

```yaml
on:
  workflow_call:
```

Leave the rest of the file (name, permissions, concurrency, jobs) unchanged.

- [ ] **Step 2: Convert `ci-java.yml` trigger**

Change:

```yaml
on:
  pull_request:
    branches:
      - main
      - release/*
    paths:
      - "packages/typespec-java/**"
      - ".github/workflows/ci-java.yml"
      - ".github/actions/setup-java/**"
  merge_group:
```

to:

```yaml
on:
  workflow_call:
```

- [ ] **Step 3: Convert `ci-typescript.yml` trigger**

Change:

```yaml
on:
  pull_request:
    branches:
      - main
      - release/*
    paths:
      - "packages/typespec-ts/**"
      - "packages/typespec-client-generator-core/**"
      - "packages/typespec-azure-resource-manager/**"
      - ".github/workflows/ci-typescript.yml"
  merge_group:
```

to:

```yaml
on:
  workflow_call:
```

- [ ] **Step 4: Verify all three declare `workflow_call`**

Run: `node --input-type=module -e "import {readFileSync} from 'node:fs'; for (const f of ['ci-python','ci-java','ci-typescript']) { const t = readFileSync('.github/workflows/'+f+'.yml','utf8'); if (!t.includes('workflow_call:')) throw new Error(f+' missing workflow_call'); if (t.includes('merge_group:')) throw new Error(f+' still has merge_group'); console.log(f, 'ok'); }"`
Expected: prints `ci-python ok`, `ci-java ok`, `ci-typescript ok`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci-python.yml .github/workflows/ci-java.yml .github/workflows/ci-typescript.yml
git commit -m "refactor(ci): make emitter workflows reusable (workflow_call)"
```

---

### Task 5: Create the entrypoint workflow + gate

**Files:**
- Create: `.github/workflows/ci-downstream.yml`

- [ ] **Step 1: Create the entrypoint workflow**

Create `.github/workflows/ci-downstream.yml`:

```yaml
name: "downstream / CI"

on:
  pull_request:
    branches:
      - main
      - release/*
  merge_group:

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  detect-affected:
    name: "Detect Affected Targets"
    runs-on: ubuntu-latest
    outputs:
      python: ${{ steps.detect.outputs.python }}
      java: ${{ steps.detect.outputs.java }}
      typescript: ${{ steps.detect.outputs.typescript }}
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - uses: ./.github/actions/setup

      - name: Install detection dependencies
        run: npm install
        working-directory: eng/scripts

      - name: Detect affected targets
        id: detect
        env:
          BASE_SHA: ${{ github.event_name == 'merge_group' && github.event.merge_group.base_sha || github.event.pull_request.base.sha }}
          HEAD_SHA: ${{ github.sha }}
        run: node eng/scripts/detect-affected.js

  python:
    name: "Python"
    needs: detect-affected
    if: needs.detect-affected.outputs.python == 'true'
    uses: ./.github/workflows/ci-python.yml

  java:
    name: "Java"
    needs: detect-affected
    if: needs.detect-affected.outputs.java == 'true'
    uses: ./.github/workflows/ci-java.yml

  typescript:
    name: "TypeScript"
    needs: detect-affected
    if: needs.detect-affected.outputs.typescript == 'true'
    uses: ./.github/workflows/ci-typescript.yml

  downstream-ci-gate:
    name: "Downstream CI Gate"
    needs: [detect-affected, python, java, typescript]
    if: ${{ always() }}
    runs-on: ubuntu-latest
    steps:
      - name: Validate downstream results
        run: |
          fail=0
          for job in \
            "detect-affected:${{ needs.detect-affected.result }}" \
            "python:${{ needs.python.result }}" \
            "java:${{ needs.java.result }}" \
            "typescript:${{ needs.typescript.result }}"; do
            name="${job%%:*}"
            result="${job##*:}"
            echo "$name => $result"
            if [ "$result" = "failure" ] || [ "$result" = "cancelled" ]; then
              fail=1
            fi
          done
          if [ "$fail" = "1" ]; then
            echo "One or more downstream checks failed or were cancelled."
            exit 1
          fi
          echo "All downstream checks passed or were skipped."
```

- [ ] **Step 2: Verify the workflow parses and has the expected jobs**

Run: `node --input-type=module -e "import {load} from 'js-yaml'; import {readFileSync} from 'node:fs'; const d=load(readFileSync('.github/workflows/ci-downstream.yml','utf8')); console.log(Object.keys(d.jobs));"`
Expected: prints `[ 'detect-affected', 'python', 'java', 'typescript', 'downstream-ci-gate' ]`.

- [ ] **Step 3: (If available) lint with actionlint**

Run: `actionlint .github/workflows/ci-downstream.yml`
Expected: no errors. If `actionlint` is not installed, skip — GitHub-side
validation on push will catch schema errors.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci-downstream.yml
git commit -m "feat(ci): add downstream entrypoint workflow and gate"
```

---

### Task 6: Push the branch and validate on a real PR

**Files:** none (live validation)

- [ ] **Step 1: Push and open a draft PR**

```bash
git push -u origin design/upstream-aware-emitter-ci
gh pr create --draft --title "Upstream-aware downstream CI (#4860)" --body "Implements #4860. See docs/superpowers/specs/2026-07-13-upstream-aware-downstream-ci-design.md"
```

- [ ] **Step 2: Verify the four scenarios via CI runs**

On the PR (push small throwaway commits as needed), confirm from the Actions tab:
1. Change under `packages/typespec-python/**` only → `Python` runs; `Java`/`TypeScript` **skipped**; gate green.
2. Change under `packages/typespec-client-generator-core/src/**` → all three run (they share `use: core-libs`).
3. Change under `packages/typespec-client-generator-core/test/**` only → **all skipped**; gate green.
4. `core` submodule bump → all three run.

Expected: each emitter runs **exactly once** (confirms no dual-trigger / double-run).

- [ ] **Step 3: Verify merge-queue base handling (dry run)**

Add the PR to the merge queue (or push to a `gh-readonly-queue`-style test).
Confirm the `Detect affected targets` step logs a non-empty `Base:` sourced from
`merge_group.base_sha`, and detection matches the PR's changes.

> No commit — this task gates the required-check swap in Task 7.

---

### Task 7: Migration — required-check swap (admin, Strategy A)

**Files:** none (repo settings — requires admin)

- [ ] **Step 1: Confirm the gate check name**

In the PR checks list, confirm the aggregating check appears as
`downstream / CI / Downstream CI Gate` (workflow name `downstream / CI`, job
name `Downstream CI Gate`). Record the exact string GitHub shows.

- [ ] **Step 2: Admin updates branch protection in one window**

A repo admin (Settings → Branches → `main` rule + merge-queue settings):
1. Add the gate check (from Step 1) to the **required status checks**.
2. Remove any now-obsolete standalone emitter check names from the required set
   (e.g. `python / test e2e / ...`, `java / test e2e / ...`, `typespec-ts / CI / ...`)
   if they were required. Because Task 4 already made the emitters
   `workflow_call`-only, those standalone names no longer post; leaving them
   required would block the queue — remove them here.
3. Apply the same required check to the merge-queue configuration.

- [ ] **Step 3: Mark the PR ready and merge**

```bash
gh pr ready
```
Merge via the normal merge-queue flow. Confirm the queue processes it and the
gate reports on both the PR and the merge-queue run.

- [ ] **Step 4: Post-merge verification on `main`**

Open a tiny follow-up PR touching only `packages/typespec-azure-core/**` (or the
submodule) and confirm the affected emitter checks now run — closing the
regression gap from #4860. Close the throwaway PR.

---

## Notes for adding future targets (autorest, tcgc, …)

Also documented in the config header. Four edits: (1) a `targets` entry in
`eng/ci/downstream-deps.yml`, (2) a new `.github/workflows/ci-<id>.yml` with
`on: workflow_call`, (3) a job + a gate `needs:` entry in `ci-downstream.yml`,
(4) the id added to the `detect-affected` job `outputs:` map.
