---
name: develop-lintdiff-rule
description: Prepare isolated worktrees and interactive worker commands for one or more migrated Swagger LintDiff rules, or develop one rule in worker mode.
argument-hint: "[rule ID ...] | --worker [rule ID] --typespec-worktree [path] --specs-worktree [path] --target-branch [branch]"
user-invocable: true
---

# Develop migrated LintDiff rules

Use this skill to implement or correct migrated Swagger validator rules in
`packages/typespec-lintdiff`.

The invocation names one or more Swagger validator rules:

```text
/develop-lintdiff-rule LatestVersionOfCommonTypesMustBeUsed
/develop-lintdiff-rule ParametersInPointGet PatchBodyParametersSchema
```

## ARM rule eligibility gate

This skill develops Swagger linter rules whose catalog applicability is `ARM`
or `Both`.

Before dispatcher mode creates branches or worktrees, and before worker mode
prepares dependencies or starts the Development workflow, check every requested
Swagger validator rule ID against
`packages/typespec-lintdiff/catalog/validator-rule-metadata.json`.

Continue only when the rule exists and its catalog `applicability` is `ARM` or
`Both`. If any requested rule is missing or `DataPlane`, stop immediately and
warn the user that `/develop-lintdiff-rule` does not support DataPlane-only
Swagger linter rules. For a single requested rule, include the rejected rule ID
and the catalog applicability found, or `not found`. For multiple requested
rules, report every requested rule and whether it is eligible; include the
catalog applicability (`ARM`, `DataPlane`, `Both`, or `not found`) for each rule
so the user can distinguish eligible and rejected rules. Do not dispatch the
eligible subset when any rule is rejected. Do not create worktrees, install
dependencies, run `compare:setup`, inspect migration evidence, edit files,
validate, commit, push, or create a PR for a rejected invocation.

## Worker existing TypeSpec coverage check

Dispatcher mode keeps its preparation-only behavior and does not perform this
check. In worker mode, after verifying the supplied worktrees but before
installing or repairing dependencies, preparing the comparison harness, or
starting the Development workflow,
determine whether the requested Swagger validator rule is already enforced by
an official TypeSpec Azure library or by the ARM TypeSpec templates. This is a
mandatory semantic check, not an exact-name search.

Fetch the user-supplied target branch from `origin` and use
`refs/remotes/origin/<target-branch>` as the source of truth. Do not use or
update a same-named local branch; it may be stale or checked out in another
worktree. Inspect all of the following:

1. Search the rule documentation under
   `packages/typespec-azure-core/src/rules` and
   `packages/typespec-azure-resource-manager/src/rules` for the exact validator
   rule ID. A matching `## LintDiff Equivalent` section is the strongest direct
   mapping, but it is only a lead until the implementation is verified.
2. Inspect the matching TypeSpec rule implementation and the package's
   `src/linter.ts`. Confirm the rule is registered and compare its actual
   conditions, exemptions, traversal, and diagnostic population with the
   validator implementation and tests. Do not infer equivalence from similar
   names or documentation alone.
3. Check the maintained ARM rule inventory:
   <https://azure.github.io/typespec-azure/docs/howtos/arm/arm-rules/>. In a
   repository checkout, use the official package rule docs and linter
   registration that generate this inventory as the verifiable source.
4. Map the validator behavior to the relevant ARM RPC guideline, when one
   exists, and inspect
   `website/src/content/docs/docs/howtos/ARM/rpc-guidelines-coverage.md` (rendered
   at
   <https://azure.github.io/typespec-azure/docs/howtos/arm/rpc-guidelines-coverage/>).
   Honor its distinction between full lint coverage, partial coverage,
   template-enforced behavior, non-lintable behavior, and an actionable gap.
   When it names template enforcement, inspect the referenced ARM templates or
   decorators rather than assuming that a missing lint rule is a gap.
5. Search related terminology and the validator's RPC or guideline identifier,
   not only the validator rule ID. Older TypeSpec rules may use a different name,
   and one TypeSpec rule may cover several validator rules.

Classify each requested rule as:

- `already covered`: an enabled official TypeSpec rule enforces all material
  validator behavior
- `template-enforced`: valid ARM TypeSpec authoring cannot express the violating
  shape without bypassing the standard templates
- `partial`: official rules or templates enforce only part of the validator
  behavior; record the exact uncovered checks
- `gap`: no official rule or template enforces the material behavior
- `uncertain`: the available implementation, registration, or guideline evidence
  is insufficient to decide safely

For `already covered` or `template-enforced`, stop before preparing the
comparison harness or changing the temporary lintdiff implementation. Report
the official rule or template and the code-backed equivalence evidence. For
`partial`, only continue when the proposed work is explicitly limited to the
uncovered behavior; reuse or extend the official rule when that is the correct
ownership instead of creating an overlapping temporary rule. For `uncertain`,
stop and surface the missing evidence rather than assuming a gap. Only `gap`
and well-scoped `partial` rules proceed to development.

To continue one dispatched rule interactively in another session, use worker
mode with the paths reported by the dispatcher:

```text
/develop-lintdiff-rule --worker ParametersInPointGet --typespec-worktree C:\dev\worktrees\lintdiff-parameters-in-point-get --specs-worktree C:\dev\worktrees\azure-rest-api-specs-lintdiff-parameters-in-point-get --target-branch feature/lintdiff-migration-new
```

## Modes

### Dispatcher mode

An invocation without `--worker` is preparation-only, whether it contains one
or multiple rule IDs. The current session creates and verifies isolated
branches and worktrees, completes their dependency installation, then reports
the copyable worktree path and worker command needed to open each rule in a new
VS Code window and start its interactive worker. It must not launch a subagent,
investigate the rule, prepare the comparison harness, edit, validate, commit, or
create a PR.

For every prepared rule, return a 1-based handoff ID starting at `1`, the
copyable typespec-azure worktree path by itself, and the exact worker-mode
invocation:

```text
1. <typespec-azure-worktree>
```

```text
/develop-lintdiff-rule --worker <rule-id> --typespec-worktree <typespec-azure-worktree> --specs-worktree <azure-rest-api-specs-worktree> --target-branch <target-branch>
```

Do not prefix the worktree path with `code -n` or any other command in the
reported path field; the user should be able to copy the path directly. After
opening the path in a new VS Code window, the user starts a new top-level chat
and runs the reported worker command. Worker mode resumes from the existing
branch and worktrees without recreating them.

### Worker mode

An invocation with `--worker` handles exactly one rule interactively. Verify
that the supplied typespec-azure worktree is on the rule branch, the supplied
specs worktree is at the pinned `specsCommit`, and both are clean except for
known in-progress changes for that rule. Skip branch and worktree creation,
perform the existing TypeSpec coverage check, verify or repair the
dispatcher-prepared dependencies, and prepare the fixture comparison harness as
described below, then execute the Development workflow. A missing or incomplete
dependency installation is recoverable worker setup, not a reason to require
another user invocation. Never accept multiple rule IDs in worker mode and
never delegate the complete workflow to a development subagent.

## Orchestration

The dispatcher must isolate each requested rule before handing it back to the
user for interactive development.

Derive the canonical rule slug for every branch and worktree from the exact
Swagger validator rule ID, not from the local TypeSpec rule file name, catalog
shorthand, or an abbreviated description. Convert the validator rule ID to
kebab-case and keep all words, for example
`LatestVersionOfCommonTypesMustBeUsed` becomes
`latest-version-of-common-types-must-be-used` and `ParametersInPointGet` becomes
`parameters-in-point-get`.

When the user requests multiple rules, treat them as independent development
units. For each rule, create a distinct rule branch, typespec-azure worktree,
and azure-rest-api-specs worktree. Create and verify the worktrees serially to
avoid competing large checkouts. The user may then open the worktrees in
separate VS Code windows and run independent top-level worker sessions.

1. Treat the user-supplied branch name as the target branch, not as the
   rule-development branch. Fetch that branch explicitly from `origin`, verify
   `refs/remotes/origin/<target-branch>` exists, and record its commit. Do not
   require, update, or compare against a same-named local branch.
2. Create a new rule-specific branch from
   `refs/remotes/origin/<target-branch>`. Its name must use the canonical
   validator rule slug, for example
   `feature/lintdiff-latest-version-of-common-types-must-be-used`. If the repo
   or user supplies a different branch prefix, keep that prefix but keep the
   suffix as `lintdiff-<validator-rule-slug>`.
3. Create a dedicated typespec-azure worktree for that rule branch. Its
   directory name must use the same canonical validator rule slug, for example
   `C:\dev\worktrees\lintdiff-latest-version-of-common-types-must-be-used`. If a
   matching clean worktree already exists for the same rule branch, reuse it
   instead of creating another worktree with a different name. If the current
   worktree was created for the target branch, do not put the rule commit
   directly on that branch.
4. Read the pinned `specsCommit` from
   `packages/typespec-lintdiff/specs/_meta.json`.
5. Create a separate azure-rest-api-specs worktree at that commit. Its directory
   name must use the same canonical validator rule slug, for example
   `C:\dev\worktrees\azure-rest-api-specs-lintdiff-latest-version-of-common-types-must-be-used`.
   If a local branch is needed for the specs worktree instead of detached HEAD,
   name it `lintdiff-specs-<validator-rule-slug>` at the pinned `specsCommit`.
   Concurrent rule-development workers must not share a writable specs checkout
   because the existing runner links packages and may change the checked-out
   revision.
6. Verify both worktrees exist at the expected branch or commit and are clean.
7. Complete dependency installation before handoff:
   - initialize the `core` submodule in every typespec-azure worktree
   - trust the typespec-azure mise configuration and run `mise install` before
     starting concurrent installs so tool installation cannot race
   - install only the repository-root tooling, the nested `core/` workspace-root
     tooling, and the lintdiff package dependency closure with
     `mise exec -- pnpm install --filter . --filter ./core --filter "tsp-lintdiff-local-linter..." --frozen-lockfile --ignore-scripts`
     in every typespec-azure worktree. Both root filters are required: build
     scripts in `core` packages load tools such as
     `prettier-plugin-organize-imports` from the `core/` importer, while
     repository commands use the top-level importer. The lintdiff closure
     filter alone does not materialize either root's complete tooling. Do not
     run an unfiltered 69-workspace install merely because a package link is
     missing
   - if and only if pnpm reports `ERR_PNPM_OUTDATED_LOCKFILE` because the target
     branch's lintdiff importer is missing from `pnpm-lock.yaml`, run
     `mise exec -- pnpm install --filter . --filter ./core --filter "tsp-lintdiff-local-linter..." --no-frozen-lockfile --lockfile=false --ignore-scripts`;
     the filters limit the fallback to both roots' build tooling plus lintdiff
     and its workspace dependency closure while creating the links needed by
     the dependency build, without modifying the tracked lockfile or running
     unrelated monorepo lifecycle setup such as the Python package environment
   - distinguish lockfile completeness from installation state:
     `--frozen-lockfile` confirms that selected manifests agree with
     `pnpm-lock.yaml`, but the lockfile does not contain installed package files
     and does not prove that the selected `node_modules` links exist. A missing
     package that is already present in the manifest and lockfile is an install
     scope or incomplete-install problem, not a reason to regenerate the
     lockfile
   - on Windows, allow up to 10 minutes for a first install and require pnpm's
     final `Done in ...` line plus a successful process exit before treating it
     as complete. If the tool wait expires, inspect the tracked shell and its
     `pnpm.exe` process, then continue reading that same shell; do not start a
     duplicate install or infer completion from a quiet progress reporter
   - use the same mise-managed Node.js to run `npm ci` in every specs worktree;
     do not use `--ignore-scripts`, and confirm the pinned specs repository's
     Node.js engine requirement is satisfied
   - run
     `mise exec -- pnpm -r --filter "tsp-lintdiff-local-linter..." build`
     after the typespec-azure install; workspace packages link to source
     checkouts whose `dist` output is not produced by installation alone
   - verify the pnpm workspace install and the specs worktree's
     `node_modules/.bin/tsp`, and confirm the lintdiff package build succeeds;
     the existence of `node_modules` alone is not sufficient
   - from the lintdiff package, resolve every package imported directly by the
     fixture harness, including
     `@microsoft.azure/openapi-validator-core`,
     `@microsoft.azure/openapi-validator-rulesets`, `lodash`, and `yaml`;
     also resolve the declared `@microsoft.azure/openapi-validator` harness
     dependency and the `tsx` loader. Also resolve the official
     `@azure-tools/typespec-azure-rulesets` package and its
     `@azure-tools/typespec-client-generator-core` peer from the lintdiff
     package because focused fixtures load the resource-manager ruleset. A
     transitive package present only under pnpm's virtual store does not satisfy
     a direct harness or fixture import
   - run this lightweight smoke check from the repository root; it verifies
     fixture-harness package and loader resolution without executing a full
     fixture comparison:
     `mise exec -- pnpm --dir packages/typespec-lintdiff exec node --import tsx/esm --input-type=module -e "await Promise.all(['@azure-tools/typespec-azure-rulesets', '@azure-tools/typespec-client-generator-core', '@microsoft.azure/openapi-validator-core', '@microsoft.azure/openapi-validator-rulesets', '@microsoft.azure/openapi-validator', 'lodash', 'yaml'].map((specifier) => import(specifier)))"`
     Do not rely only on build output that excludes the test harness
   - treat any install or verification failure as a dispatch failure and do not
     hand off that worker for interactive development
8. Report the 1-based handoff ID, rule ID, canonical validator rule slug, target
   branch, rule branch, specs branch when one was created, both absolute
   worktree paths, completed dependency status, and the exact worker-mode
   invocation. Do not include a `code -n` wrapper around any worktree path.

Create and verify worktree pairs serially. After `mise install` has completed,
pipeline the repository-local dependency installs: start the typespec-azure and
specs installs for a verified pair in parallel, then create the next pair while
those installs run. Keep at most two pairs in the install phase at once to
avoid excessive shared package-cache, network, and disk contention. Wait for
all installs and verifications before reporting the handoffs.

Do not run `compare:setup` in dispatcher mode. The worker performs that
rule-specific direct link step after development begins and rebuilds the local
linter when source changes.

## Worker setup

Before starting the Development workflow, the top-level worker must prepare
its supplied worktrees:

1. Ensure both worktrees are at the expected branch or commit and are clean
   except for known in-progress changes for this rule. Stop only when continuing
   would overwrite or mix unrelated changes.
   Fetch the user-supplied target branch explicitly from `origin` and use
   `refs/remotes/origin/<target-branch>` for base verification and all target
   comparisons; never substitute a same-named local branch. If the dedicated
   rule branch has no rule-specific commits or changes and is behind the remote
   target, fast-forward it to the fetched remote target before continuing. If
   rule work already exists, preserve it and verify that the diff from its
   merge base contains only known work for this rule. Do not treat commits that
   exist only on the advancing remote target as unrelated rule-branch changes,
   and do not rebase or reset the rule branch automatically.
2. Perform the mandatory Worker existing TypeSpec coverage check before doing
   dependency work. Stop without installing dependencies or preparing the
   comparison harness when the result is `already covered`,
   `template-enforced`, or `uncertain`.
3. Verify the dispatcher-prepared dependencies against their lockfiles. Confirm
   the typespec-azure worktree has its initialized `core` submodule and usable
   pnpm workspace dependencies, confirm the lintdiff dependency closure has
   built output, confirm direct fixture-harness imports resolve from the
   lintdiff package, and confirm the specs worktree has
   `node_modules/.bin/tsp`. Do not reinstall or rebuild dependencies that pass
   these checks.
4. If a dependency or build check fails, recover in the current worker session
   instead of stopping for another user invocation:
   - identify the narrow failed layer: submodule initialization, mise tools,
     typespec-azure pnpm install, lintdiff dependency build, specs `npm ci`, or
     direct harness package resolution
   - rerun only that layer using the same pinned, filtered,
     lockfile-respecting commands required in dispatcher mode, then repeat its
     concrete verification. When a declared and locked root build tool is
     missing, rerun the two-roots-plus-lintdiff filtered install; do not
     escalate directly to an unfiltered workspace install
   - if `ERR_PNPM_OUTDATED_LOCKFILE` matches the documented lintdiff-importer
     case, use the documented no-lockfile fallback rather than editing the
     lockfile merely to complete local setup
   - if harness source directly imports a package that is absent from its
     manifest, treat that as a repository dependency defect rather than an
     installation defect: add the narrow direct development dependency with
     the repository package manager, retain the manifest and lockfile change as
     an explicit harness prerequisite, and continue the rule workflow. Apply
     the same rule when focused fixture compilation loads an official ruleset
     whose package or required peer is absent from the lintdiff manifest
   - for an existing workspace package, update the lintdiff manifest with
     `pnpm pkg set` rather than `pnpm add`; `pnpm add` can resolve all lockfile
     entries and rewrite machine-specific registry metadata even though no new
     external package is needed. Then use the filtered lockfile-only command
     below, discard unrelated churn, and verify the retained importer entry
     with the frozen filtered install
   - when that dependency repair requires refreshing `pnpm-lock.yaml`, inspect
     the resulting churn. The target branch can lack a
     `packages/typespec-lintdiff` importer, so adding the importer and its
     necessary dependency closure can be correct. Preserve target-branch
     entries and retain only that new importer plus dependency nodes genuinely
     absent from the target branch. Do not silently accept unrelated resolution,
     integrity, tarball, or private-feed URL rewrites caused by machine-specific
     registry metadata.
   - generate the lockfile separately from package installation with
     `mise exec -- pnpm install --filter "tsp-lintdiff-local-linter..." --lockfile-only --ignore-scripts`.
     Always use pnpm's configured default registry. Do not pass
     `--registry=https://registry.npmjs.org/` locally; direct access is not
     supported in the development environment. Inspect the diff before
     proceeding and discard unrelated lockfile churn, including private-feed
     tarball URL or integrity rewrites
   - verify the normalized manifest and lockfile with a frozen-lockfile install,
     using
     `mise exec -- pnpm install --filter . --filter ./core --filter "tsp-lintdiff-local-linter..." --frozen-lockfile --offline --ignore-scripts`
     when the required artifacts are already in the pnpm store, or omit
     `--offline` when they are not. If the lockfile cannot be normalized and
     verified reliably, stop and report that blocker rather than hand-editing
     an unverifiable lockfile.
   - never use an unversioned global install, manually copy packages into
     `node_modules`, or silently bypass the lockfile
   - stop only after the bounded repair fails because of a concrete external
     blocker such as unavailable credentials or network, insufficient disk,
     an unsatisfied pinned toolchain, or conflicting unrelated worktree changes;
     report the attempted repair and exact blocker
5. Prepare the fixture comparison harness:
   - run `pnpm --dir packages/typespec-lintdiff compare:setup -- --specs-repo
<isolated-specs-worktree>` to build the linter and create the direct link in the
     specs worktree
   - separately provide the focused fixture source inputs immediately before
     focused validation: either set and verify `LINTDIFF_VALIDATOR_ROOT` and
     `LINTDIFF_COMMON_TYPES` against existing local sources, or create the two
     documented temporary links. `compare:setup` does not populate these
     sources. Do not assume a fresh rule worktree already contains
     `test/azure-openapi-validator` or `test/common-types`
6. Verify that the specs worktree's local
   `node_modules/tsp-lintdiff-local-linter` resolves directly to the supplied
   typespec-azure worktree. `compare:setup` creates a direct per-worktree link
   and does not use npm's shared global link registry, so separate specs
   worktrees can prepare concurrently without redirecting each other.

### Temporary fixture-harness link lifecycle on Windows

Focused fixture validation can require
`packages/typespec-lintdiff/test/common-types` and
`packages/typespec-lintdiff/test/azure-openapi-validator` links or junctions
when those sources are not otherwise configured. Treat only those two known
paths as temporary focused-validation setup; they are not needed for
`specs:typespec` corpus runs.

Create them immediately before the focused fixture validation that needs them.
After the final focused validation, remove only those known temporary links or
junctions. If focused validation must be rerun, recreate the two links, validate,
and remove the same two links again before continuing.

Never run repository-wide `pnpm format` (`prettier --write .`) or `pnpm lint`
from a lintdiff worker. Their recursive scope can follow temporary links into
external checkouts, rewrite thousands of unrelated files when the target branch
has formatting drift, reformat harness-owned snapshots incompatibly with the
snapshot serializer, and fail on unrelated package baseline warnings. The
targeted formatting and linting procedure below is the task-specific exception
to the repository's default commit-time commands.

Corpus reruns remain safe without these test links: the corpus runner uses the
isolated specs checkout, its copied dataset and common-types content, and the
direct linter-package link within the specs checkout.

## Development workflow

The top-level worker works only in the supplied typespec-azure worktree.

### 1. Establish evidence

- Read the fixture `rule.md`, production TypeSpec rule, fixtures, snapshots,
  and `migration.md`.
- Read both coverage reports:
  - `packages/typespec-lintdiff/docs/coverage_old.md`
  - `packages/typespec-lintdiff/specs/coverage-breakdown.md`
- Follow `/analyze-swagger-typespec-lint-gap` to align populations and identify
  real semantic misses.
- Decide whether the production TypeSpec rule actually requires a change.
- Do not require equal raw Swagger and TypeSpec diagnostic counts.

#### Emission-dependent semantic completeness gate

When the Swagger rule selects, resolves, or compares an emitted OpenAPI field,
do not treat upstream validator tests, observed corpus overlap, or coverage of
the containing authorable surface as complete semantic evidence. Before
implementing or accepting the migrated rule:

1. Trace the emitter path from the relevant TypeSpec semantic target to the
   OpenAPI node and field inspected by the Swagger rule.
2. Enumerate every authorable TypeSpec type family and meaningful subtype that
   can reach that emitter path. Include default and fallthrough branches,
   unsupported-but-emitted shapes, transformed or inherited types, and
   decorator- or content-type-dependent branches when they affect the selected
   OpenAPI field.
3. Record a rule-local emission matrix with, at minimum:
   - authored TypeSpec shape
   - emitter function or branch
   - whether the selected OpenAPI field is present
   - its emitted value or value category when present
   - expected Swagger result
   - expected TypeSpec lint result
   - the fixture that proves the row
4. Distinguish **surface coverage** from **shape coverage**. A request-body,
   response-body, parameter, or model fixture proves only the represented
   shapes within that surface.
5. Treat any reachable but unclassified emitter branch as unresolved
   uncertainty. Do not claim functional equivalence or proceed to the PR until
   the matrix is closed or the branch is proven unauthorable for the rule's
   scope.

The full corpus is observational regression evidence: it proves behavior only
for shapes present in the selected projects and versions. Even complete
same-project overlap cannot replace the emission matrix or establish universal
semantic coverage.

### 2. Implement the focused rule change

When evidence requires a rule update:

- change the production TypeSpec rule
- add directly related violating, compliant, and regression fixtures
- for an emission-dependent rule, add fixtures for every distinct matrix
  outcome and every implementation branch whose fallback behavior can change
  whether the selected OpenAPI field exists
- update snapshots and fixture `rule.md`
- update the rule's `migration.md`

Do not change Swagger validator code, emitters, or unrelated TypeSpec rules.

### 3. Run focused validation

Run the narrowest existing fixture tests, package build, and package lint
commands that cover the changed rule. Fix failures before running the corpus.

### 4. Run the existing corpus analysis

Use the existing full runner; do not add a per-rule runner:

```powershell
pnpm --dir packages/typespec-lintdiff specs:typespec `
  --specs-repo <isolated-azure-rest-api-specs-worktree> `
  --concurrency 6
```

The command runs all local rules and rewrites canonical TypeSpec results and
coverage files in this development worktree. Use the refreshed rule row and
rule shard to verify project overlap, validator-only projects, TypeSpec-only
projects, and compile failures.

The retained Swagger corpus represents the dataset-selected latest API version,
while ordinary TypeSpec lint output may contain diagnostics from every declared
API version. For every TypeSpec-only project, determine whether each diagnostic
belongs to the selected latest API version or only to an older version:

1. Read the project's selected `apiVersion` from the corpus metadata.
2. Inspect the diagnostic target and the service's versioning decorators.
3. Project the service to the selected API version when source inspection alone
   cannot establish whether the target or violating type is present.
4. Compare Swagger only with TypeSpec diagnostics attributable to that selected
   version. Treat diagnostics that exist only in older API versions as a
   population mismatch, not as a rule-semantic gap.
5. Preserve and report the raw TypeSpec counts separately. Do not change the
   production rule merely to suppress valid diagnostics from older API
   versions.

Use an existing rule-specific projected filter when one is available. Otherwise
perform and document this attribution during the migration investigation rather
than assuming every raw TypeSpec-only diagnostic applies to the retained
Swagger version.

If a quick iteration is needed first, use the existing `--filter`, `--limit`,
and `--concurrency` options. The final behavioral check should use the full
corpus when practical.

#### Long-running corpus status protocol

- Run a representative filtered corpus first to confirm the command, links, and
  output paths before starting the full corpus.
- Before each run, report its scope, project count, and expected duration.
- When a visible terminal is available, run the corpus there so the user can
  continuously see the runner's progress and heartbeat output. Do not require
  an exact progress-message format.
- Otherwise, run it as a persistent background process, preserve its output in
  a log file outside generated corpus directories, and report periodic status
  from the log until it finishes.
- Detect interrupted or stale runs instead of assuming silence means progress.
  Confirm the process is still active and that its log or generated output is
  advancing; stop and report a run that has exited unexpectedly or stopped
  making progress.
- Before retrying an interrupted run, identify partial generated corpus
  artifacts from that run and remove only those known generated paths. Never
  use broad cleanup commands or remove source fixtures.
- When the run ends, report its completion timestamp and final status,
  including failures or interruption rather than presenting a partial run as
  complete.

### 5. Refresh the rule migration note

After the final corpus run, update the rule's `migration.md` from the newly
generated results. This update is required whenever the production rule
changes.

Record:

- the specs commit and whether the run was full or partial
- latest validator and TypeSpec project and diagnostic counts
- same-project overlap
- complete validator-only and TypeSpec-only project lists
- the selected-latest-version TypeSpec population used for behavioral
  comparison, including diagnostics excluded because they belong only to older
  API versions
- compile failures and their effect on the assessed population
- explanations for remaining gaps
- the standard code-backed example from
  `/analyze-swagger-typespec-lint-gap` for every distinct material gap cause
- the final conclusion on functional equivalence and any uncertainty

Do not leave earlier corpus numbers in `migration.md` as though they describe
the updated rule. Clearly label partial results when a full run could not be
completed.

### 6. Exclude generated corpus data from the PR

Coverage regeneration is validation evidence only for a rule-development PR.
Do not commit it.

Before preparing the PR:

1. Confirm `migration.md` contains the latest corpus evidence.
2. Restore all generated changes under
   `packages/typespec-lintdiff/specs`.
3. Confirm the remaining diff contains only the production TypeSpec rule,
   directly related fixtures, snapshots, tests, and migration note, plus any
   explicit package manifest and lockfile repair required for the fixture
   harness to load its direct imports.
4. Stage explicit rule-related paths. Never use a broad command that could
   include refreshed coverage data.

Canonical coverage is rebuilt separately and serially on the target branch
after rule PRs merge.

### 7. Format and lint only the rule diff

After restoring generated corpus data and removing temporary fixture links:

1. Build a flat list of manually maintained files changed by the rule:
   production `.ts` files, fixture `main.tsp` and `expect.json` files,
   `rule.md`, `migration.md`, and any directly changed tests. On PowerShell,
   append each command result to the same array; do not create a nested array
   whose entries become space-joined formatter arguments.
2. Run Prettier with those explicit paths only. Do not include harness-owned
   `output.json`, `tsp-diagnostics.json`, or `validator-diagnostics.json`
   snapshots, and never use `prettier --write .`.
3. Run the package build and invoke `oxlint` only on the changed TypeScript
   source and test files. Do not use package- or repository-wide lint as a
   proxy when it has unrelated baseline warnings.
4. Run focused fixture validation after formatting. If snapshots need updates,
   use `validate --rule <ValidatorRuleId> --update-snapshots`, then rerun the
   same command without `--update-snapshots`. Do not format snapshots afterward.
5. Check `git status`, `git diff --check`, and the staged file list. If a broad
   tool was accidentally run, restore unrelated tracked paths in one bulk
   operation with a reviewed pathspec; do not execute thousands of individual
   `git restore` processes.

This procedure satisfies the repository formatting and linting requirement for
lintdiff worker PRs while preserving generated snapshot fidelity and keeping
validation scoped to the change.

### 8. Run an independent code review

Before committing or creating the PR, the main agent must assign the complete
rule-related diff to a separate code-review subagent.

The reviewer must:

- compare the rule branch against the freshly fetched
  `refs/remotes/origin/<target-branch>`, not a same-named local branch
- inspect the production rule, fixtures, snapshots, `rule.md`, and
  `migration.md`
- check for semantic misses, false positives, incorrect TypeSpec compiler API
  usage, version/projection mistakes, unstable diagnostic targets, ineffective
  deduplication, and misleading diagnostics
- verify that fixture evidence covers the implementation's important branches
- for an emission-dependent rule, independently audit the negative space:
  compare the rule against every reachable emitter type branch, default path,
  and fallthrough in the recorded emission matrix rather than limiting review
  to branches made explicit by the TypeSpec rule implementation
- confirm that corpus parity is not being used to close an untested matrix row
- confirm generated corpus and coverage files are absent from the PR diff
- report only concrete, actionable findings with file and line references

After the review:

1. Evaluate each finding against the rule's source behavior and corpus
   evidence. Do not adopt a suggestion merely because the reviewer proposed it.
2. Apply every finding that is technically correct and within the rule PR's
   scope.
3. Record why any rejected finding does not apply.
4. Rerun the affected focused tests, build, lint, and corpus validation when a
   review fix changes rule behavior.
5. Request a follow-up review from the same subagent when changes materially
   alter the reviewed implementation.
6. Proceed only when no unresolved high-confidence correctness findings remain.

### 9. Commit, push, and create the draft PR

Finishing validation is not the end of this skill. The top-level worker must
complete the GitHub handoff unless the user explicitly asks to stop before
creating a draft PR.

1. Fetch the user-supplied target branch from `origin`, then confirm the current
   branch is the dedicated rule-specific branch and is based on that remote
   target. Do not use a same-named local branch for this check.
2. Confirm neither the rule commit nor generated coverage data was added to the
   target branch.
3. Commit only the explicit rule-related paths and any required fixture-harness
   dependency repair identified above.
4. Push the rule branch to the `origin` repository. Do not push or update the
   target branch; the fetched remote target is the source of truth.
5. Create the pull request in the `origin` repository as a **draft**, with the
   rule branch as head and the user-supplied target branch as base. Do not mark
   it ready for review; the user decides when the migration evidence and rule
   behavior are ready for formal review.
6. Set the PR title to the exact stable pattern
   `[Swagger Linter Migration] <ValidatorRuleId> (origin)`, replacing
   `<ValidatorRuleId>` with the original Swagger validator rule ID.
7. Write the PR description as an engineering explanation, not only a change
   list. It must include:
   - **Original Swagger linter:** include both of these direct GitHub hyperlinks
     before listing a checklist of every specific check the original rule
     performs:
     - `linter code: [<ValidatorRuleId>](<validator source URL>)`
     - `linter doc: [<validator-doc-file>.md](<validator documentation URL>)`
       Use the rule name and links from the fixture `rule.md` or validator
       repository. Do not omit either link or replace them with unlinked paths.
   - **How the Swagger linter works:** explain the Swagger objects it inspects,
     traversal or lookup strategy, conditions and exemptions, diagnostic
     locations, and any known validator defects, stale maps, emitted-occurrence
     duplication, or other discrepancies that should not be copied.
   - **How the migrated TypeSpec linter works:** describe the TypeSpec semantic
     targets inspected, important compiler or library APIs used,
     version/projection handling, diagnostic targeting and deduplication
     decisions, and how these choices match the intended Swagger behavior.
   - **Migration evidence:** link directly to the rule's `migration.md` for the
     declared focused tests, real-service project comparison, latest full-corpus
     counts, one-sided project explanations, compile failures, and remaining
     uncertainty. Do not duplicate the detailed migration table or corpus
     declaration in the PR description when `migration.md` already contains it.
8. Prefer concrete examples, project names, and before/after evidence. Avoid a
   generic bullet such as “improve parity” without explaining the actual
   missing semantic behavior.
9. Return the PR URL as the rule's final workflow result.

## Guardrails

- In dispatcher mode, the current session only creates and verifies branches
  and worktrees, completes locked dependency installs, and reports handoff
  commands. It must not run comparison setup or perform rule development and
  must not launch development subagents.
- Never develop multiple rule PRs in one worktree.
- Maintain a one-to-one mapping between each rule, rule branch, typespec-azure
  worktree, azure-rest-api-specs worktree, and top-level worker session.
- Keep each rule's source branch names and worktree directory names tied to the
  canonical Swagger validator rule slug so source branches can be linked and
  prepared worktrees can be found and reused later.
- Never share a writable specs worktree between concurrent workers.
- Never allow two specs worktrees to resolve
  `node_modules/tsp-lintdiff-local-linter` to the same rule worktree.
- Worker mode must reuse and verify the supplied worktrees; it must not create
  replacements or dispatch another agent to own the complete workflow.
- Worker mode must repair an incomplete dispatcher dependency handoff in place
  when the bounded recovery steps can do so safely. It must not stop merely to
  ask the user to rerun the dispatcher or invoke the worker again.
- Stop if either worktree has unrelated changes before the workflow starts.
- Surface compile, projection, linking, and corpus failures explicitly.
- Do not silently omit failed projects from the conclusion.
- Do not commit `packages/typespec-lintdiff/specs` changes in the rule PR.
- Keep required changes focused on the TypeSpec rule and directly related
  tests, except for a narrowly scoped fixture-harness dependency repair needed
  to execute validation.
- Do not stop after validation when the requested workflow includes a draft PR.
- Do not skip independent review because focused tests or corpus coverage pass.

## Deliverable

Dispatcher mode returns only:

- per-rule 1-based handoff ID, worktree and dependency preparation status,
  target branch, rule branch, and both absolute worktree paths
- the exact worker-mode invocation for every rule
- any branch, worktree, or dependency preparation failure that prevents handoff

Worker mode returns:

- the existing TypeSpec coverage classification and supporting official rule,
  template, or guideline evidence
- for each rule, whether and how the TypeSpec rule changed
- per-rule focused fixture evidence
- per-rule full-run project overlap and one-sided project lists
- per-rule compile failures or remaining uncertainty
- per-rule review findings adopted and rejected, with reasons
- the explicit rule-related files and any required fixture-harness dependency
  repair ready for each PR
- each created draft PR URL

## Post-run process review

After the draft PR is created and the deliverable is complete, briefly review
the run before the final user response. Capture concrete suggestions for the
next lintdiff rule, especially:

- steps that cost unexpected time and how to avoid or parallelize them next time
- status reporting that was missing, stale, or too noisy, and the progress or
  heartbeat evidence that proved the run was still healthy
- commands that were too broad, stalled, or failed for environmental reasons,
  together with narrower commands that proved sufficient
- setup shortcuts that are safe to reuse, such as prepared worktrees,
  initialized submodules, installed dependencies, direct comparison links, or
  already-built package dependency closures
- corpus, fixture, and migration evidence that made the equivalence conclusion
  clearer or more reliable
- skill instructions that should be updated based on the observed run

Print the suggestions in the final handoff and ask the user whether any should
be adopted into this skill. Do not update the skill automatically from the
post-run review; only make skill changes after the user explicitly approves the
specific suggestion(s).
