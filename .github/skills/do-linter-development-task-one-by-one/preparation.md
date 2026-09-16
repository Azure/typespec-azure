# Workspace preparation contract

The queue owns preparation before dispatching development. Prepare development,
specs and promotion as one bundle for the current rule, not as side effects of
delegated development or promotion. Prepare rules serially in input order; do
not prepare later rules while the current rule has active task work. Standalone
development dispatchers use the development/specs subset of this contract;
standalone promotion uses the promotion subset. These callers own their own
preparation and do not invoke the queue or start its four-phase workflow.

Preparation is not development, promotion, review or publication. No source is
copied into promotion, and its source SHA remains `not selected` until clean
development review. Existing semantic coverage gates still run before worker
dependency repair or rule work; advance environment preparation is not evidence
that a new lint is justified.

Queue-specific requirements (both owners, ledger/status, cross-task isolation,
completion delivery and review routing) apply only to queued runs. A standalone
caller prepares only its required subset, applies its own eligibility and
confirmation policy, and reports directly to its user. Do not impose the queue's
ARM eligibility gate on standalone promotion or require it to create development
and specs resources. A standalone phase owner may use its own verified checkout;
it must not message itself or create another owner merely to run setup.

## Coordinator and folder scope

For queued runs, `worktrees_folder` is the queue's normalized absolute
`--worktrees-folder` value, defaulting to `C:\dev\worktrees`. This is a required
placement boundary, not a naming preference. It applies to development, specs,
promotion and any auxiliary checkout used for task edits or builds. Standalone
skills do not gain a new CLI option; they inherit this boundary when queued.

Resolve the target repository independently of cwd before reading the catalog or
running Git. Prefer the repository containing the loaded authoritative skill if
its remote identity is `Azure/typespec-azure`. Otherwise use configured projects
and their Git worktree/common-repository identities to resolve that repository.
Record the exact repository root and project; do not choose an unrelated current
project or an arbitrary same-repo project. If distinct candidate repositories
cannot be disambiguated by supplied context, stop with a repository-selection
blocker. Resolve specs separately by its repository identity. Read-only base
repositories and authoritative instruction/result artifacts may be outside the
worktrees folder; they are not task execution checkouts.

Normalize Windows separators, case and trailing separators. Require a
fully-qualified drive or UNC path, not `C:relative` or `\root-relative`. Before
accepting a candidate, require it to be a strict descendant of the folder by path
segments, not a string prefix (`C:\dev\worktrees-other` is outside). Resolve
junctions/symlinks and verify physical containment as well as lexical containment.
For nonexistent paths, check the nearest existing ancestor and recheck the final
resolved directory before use; a link must not escape the boundary. If physical
resolution is unavailable or ambiguous, stop rather than assuming containment.
Never use the folder itself as a rule worktree.

Filter Git/app inventories by this boundary before selecting reusable resources.
Search only the selected folder for candidate task checkouts, then verify task,
repository, branch and ownership; directory names alone are insufficient.
Out-of-folder worktrees are not reusable in this invocation, even if a previous
run recorded them. Preserve them and report the conflict rather than moving,
copying, replacing or silently selecting them. A resume under another folder
does not authorize transferring work or resetting budgets.

For ordinary Git worktrees, choose deterministic child paths under the folder
using the role/validator slugs below. For app-managed worktrees, inspect supported
placement controls BEFORE creation. Require evidence that the tool/configuration
will place the checkout inside this folder; recheck the returned path afterward.
If the exposed `create_session` schema has no location argument and no supported
configured placement can be verified, return `worktree-placement-unavailable`
before invoking it. Do not invent `path`/`worktreesFolder` arguments, change
undocumented app settings, create an out-of-folder session and move it, or treat
the selected project root as proof of its worktree destination.

Exact existing in-folder owners may still be reused without a placement control.
Non-destructive registration of an ownerless existing checkout uses only the
explicitly authorized adoption procedure. For NEW PRs, registration alone is
insufficient: a supported exact-folder owner and correct publication base must
both be established. An explicit-target backend may create a Git worktree under
the folder only if that publication backend is actually permitted.

## Ownership and ordering

1. Validate the complete input, folder scope and caller's eligibility requirements before creating resources.
   Select the [publication backend](app-session-execution.md#select-the-backend)
   and lifecycle. Inspect outer review capabilities before repository work; app
   owners also acknowledge their capabilities during setup. Establish completion
   delivery before sending setup messages. Setup dispatches need the same unique
   IDs, durable results, deadlines and quiescence checks as phase dispatches.
   Classify each phase as `create` or `update-existing` under the shared publication
   contract; do not require new-PR creation capabilities for an existing-PR update.
   Initialize the durable manifest and authoritative instruction paths/hashes
   before the first setup dispatch; later steps append their readiness evidence.
2. Mark the current entry running with `phase: preparation`. Resolve canonical
   fetch and intended head repositories by URL and GitHub identity. Fetch the
   canonical development target and `main`, recording both remote refs and SHAs;
   never update same-named local target branches. Only fetch bases required by a
   standalone subset. No dependency installation starts until every required
   publication binding and checkout passes readiness.
3. Discover recorded in-folder resources first. For a prepared worker command, preserve its
   exact paths and command; verify/reuse the existing development owner and specs
   checkout. For bare rule input, discover only recorded task-owned resources or
   create new ones. Never appropriate a same-named unrelated worktree/session.
   Existing publication failures retain their lifecycle and recovery budgets;
   bare rule input is not authorization to replace failed work or restart it.
4. Create or verify the two distinct TypeSpec publication owners through
   [app-owned checkout preparation](app-session-execution.md#dispatcher-preparation)
   in app-session mode. The development base is
   `feature/lintdiff-migration-new`; promotion's is `main`. Create them serially,
   with setup-only messages and no development kickoff. Verify supported placement
   before creation, then validate actual app-returned paths against the folder.
   For the explicit-target backend, create/reuse ordinary dedicated Git worktrees
   from the verified remote commits. This route is permitted only when the
   publication tool can explicitly target the intended repository/base/head.
5. Derive branch suffixes from the exact catalog validator rule ID, converted to
   kebab-case with every word retained: development `lintdiff-<validator-slug>`
   and promotion `promote-lintdiff-<validator-slug>`, preserving configured branch
   prefixes. Ordinary worktree directories use those slugs; app-returned
   directories need not, but must still satisfy the folder boundary. Never rename
   an existing task branch to fit this pattern.
6. Read `specsCommit` from the prepared development checkout's
   `packages/typespec-lintdiff/specs/_meta.json`. Resolve the local
   `azure-rest-api-specs` repository and verify its identity and pinned commit.
   Use a separate in-folder checkout at that commit, preferably detached, named
   `azure-rest-api-specs-lintdiff-<validator-slug>` (or preserve the supplied path).
   If a local branch is needed, use `lintdiff-specs-<validator-slug>`. Never share
   this writable checkout between rules: harness setup changes its package links.
   If the repository/commit is unavailable, report that prerequisite; do not
   silently substitute a newer commit or another specs repository.
7. Normalize paths case-insensitively on Windows. For the queue, require all three
   paths to satisfy folder containment and be distinct and non-nested; reject overlaps
   with any other queue entry's resources or owner IDs. Development and promotion
   must have distinct branches and, in app-session mode, distinct app owners.
   An existing exact-path owner may
   be reused only with verified task ownership and quiescence; ordinary legacy
   worktrees require the separate explicit adoption authorization. Never use an
   unrelated coordinator checkout for task edits or builds.
8. Apply bounded checkout readiness to every created owner and verify specs
   HEAD/status. For queued work, initialize the ignored shared development `log.txt` using the
   queue's logging contract; before that path is ready, write setup evidence to
   durable session artifacts and append a reference to it afterward. Preserve
   partial preparation state on failure; do not delete/recreate resources.
9. Execute the dependency profiles below, verifying existing installations first
   and repairing only missing/invalid layers. The coordinator orchestrates each
   setup action; app owners execute commands in their own checkout via bounded
   setup-only dispatches. Keep only one owner active at a time. Specs commands
   may run directly in their recorded path while TypeSpec owners are idle.
   Do not concurrently install shared toolchains or launch duplicate installs.
10. Verify both publication bindings again and persist the preparation manifest.
    Confirm every setup owner and command has stopped before dispatching
    development. A failure is `failed` if no development PR exists, otherwise
    `partially-succeeded`; stop later entries only when quiescence is unverified.
    Preparation does not consume a source-repair cycle or reset any retry budget.

## Command location and publication identity

Every shell invocation must select its intended checkout in that invocation.
PowerShell calls do not retain earlier `Set-Location` or environment changes.
Use `Set-Location -LiteralPath '<absolute-root>'` with terminating error handling,
verify `git rev-parse --show-toplevel` against that root, and only then execute
commands. Use absolute paths for file tools and explicit repositories for GitHub
reads. When running specs commands, use the development checkout's verified
mise-managed Node.js environment; do not assume changing to the specs directory
retains the TypeSpec toolchain selection.

This shell guard does not bind publication. For app-session publication require:

`caller session ID = recorded phase owner ID`

and matching in-folder app path/head/comparison base, local Git path/head,
intended remote head and canonical base for NEW PR creation. Check these through supported app metadata and Git
controls, not environment variables or upstream hints. The owning session's main
agent calls the required creation tool; its subagents and the coordinator cannot
substitute for it. Missing explicit-target arguments in that tool mean a
directory change cannot select another owner. Never probe publication by creating
a disposable PR.

For an existing verified PR, use the shared `update-existing` path: its GitHub
base/head are authoritative, and all diffs, pushes and updates explicitly target
that PR and its recorded worktree. A differing app comparison base is recorded
but is not a creation-binding failure when no creation tool will be called.

## Dependency profiles

Use these shared recipes rather than duplicating setup commands in workers.
Before installing, run the relevant readiness checks below. Install/restore only
after a missing or invalid prerequisite is observed, or dependency manifests have
changed. Keep actual command, exit status, raw-output artifact and resulting
readiness evidence for every layer.

### Common TypeSpec prerequisites

- Initialize `core` with `git submodule update --init` at the checkout's recorded
  gitlink; never move it to an arbitrary newer commit.
- Check `mise --version`; when present, trust the exact checkout if necessary,
  run `mise install`, and use `mise exec --` for tools. Finish shared tool
  installation before repository dependency work. Record active versions with
  `mise ls --current`. Without mise, require versions matching that checkout's
  tool configuration and `packageManager`; do not use unversioned global installs.
- Verify full Git status after setup. Do not stage generated files, `core`,
  `pnpm-lock.yaml` or logs as incidental setup changes. Unexpected tracked changes
  require an explicit dependency-defect diagnosis, not silent cleanup.

### Development and specs

1. In development, materialize repository-root tooling, nested `core` root
   tooling and the lintdiff closure:
   `mise exec -- pnpm install --filter . --filter ./core --filter "tsp-lintdiff-local-linter..." --frozen-lockfile --ignore-scripts`.
   Both root filters are necessary for build tools; do not escalate to an
   unfiltered workspace install because a link is missing.
2. Only if `ERR_PNPM_OUTDATED_LOCKFILE` identifies the known missing lintdiff
   importer on the target branch, use the same filters with
   `--no-frozen-lockfile --lockfile=false --ignore-scripts` instead of
   `--frozen-lockfile --ignore-scripts`. This fallback must not modify the tracked
   lockfile. Other lockfile errors are not covered. A locked package with a
   missing installed link needs installation, not lockfile regeneration.
3. Use the same pinned Node.js to run `npm ci` in specs, without
   `--ignore-scripts`, after confirming the specs Node engine requirement.
   Verify its `node_modules/.bin/tsp` is usable.
4. Build missing/outdated workspace outputs with
   `mise exec -- pnpm -r --filter "tsp-lintdiff-local-linter..." build`.
   Installation alone does not create linked workspace `dist` outputs.
5. From the development root run this fixture-import smoke check:
   `mise exec -- pnpm --dir packages/typespec-lintdiff exec node --import tsx/esm --input-type=module -e "await Promise.all(['@azure-tools/typespec-azure-rulesets', '@azure-tools/typespec-client-generator-core', '@microsoft.azure/openapi-validator-core', '@microsoft.azure/openapi-validator-rulesets', '@microsoft.azure/openapi-validator', 'lodash', 'yaml'].map((specifier) => import(specifier)))"`.
   These packages and the `tsx` loader must resolve from the lintdiff package;
   virtual-store presence or a build that excludes the harness is insufficient.
6. A failed check identifies the layer to repair. Apply
   [dependency repair](#dependency-repair) for missing direct manifest dependencies;
   do not manually copy packages or rewrite registry metadata. Preserve prerequisite
   changes explicitly in the handoff for worker validation and publication.
   These proven dependency-manifest repairs are the only tracked edits permitted
   in queue setup; no lint implementation or semantic investigation is allowed.
   Standalone preparation-only dispatchers instead report a dependency defect
   requiring tracked edits, preserving their existing no-edits handoff contract.

On Windows, allow up to 10 minutes for the first pnpm install; require its final
completion output and successful process exit. A tool wait expiring is not
process completion: read the same tracked shell and inspect that exact process,
without starting another install. An active operation reaching its deadline must
be reconciled and stopped through the quiescence contract before moving on.
External dependency/network/credential failures do not permit worker restarts.

Do not run `compare:setup` or corpus analysis during preparation. The development
worker owns rule-specific linking after semantic coverage checks, uses the exact
specs checkout, and rebuilds the local linter when its source changes.

### Dependency repair

This is the single dependency-recovery policy for queue setup and development
workers. Respect the queue's existing draft-correction allowances when applicable;
do not turn a dependency failure into a worker restart or source-repair cycle.

1. Identify the failed layer: submodule initialization, mise tools, TypeSpec pnpm
   installation, lintdiff dependency build, specs `npm ci`, or direct harness
   resolution. Rerun only that layer using the profiles above, then repeat its
   concrete readiness check. A missing locked package is not a reason to expand
   install scope or regenerate the lockfile.
2. If the harness directly imports a package absent from its manifest, treat it
   as a repository dependency defect. Add the narrow direct development dependency
   with the package manager and retain it as an explicit harness prerequisite.
   The same applies to an official ruleset or required peer loaded by fixtures.
   Preparation-only standalone dispatchers report this defect instead of editing.
3. For an existing workspace package, use `pnpm pkg set` rather than `pnpm add`;
   the latter can resolve all lockfile entries and rewrite machine-specific
   registry metadata. Generate any needed lockfile update separately using
   `mise exec -- pnpm install --filter "tsp-lintdiff-local-linter..." --lockfile-only --ignore-scripts`.
4. Inspect lockfile churn. The target branch may lack the lintdiff importer;
   retain that importer and only its genuinely missing dependency nodes while
   preserving existing target entries. Exclude unrelated resolution, integrity,
   tarball or private-feed URL changes. Always use the configured default registry;
   do not pass `--registry=https://registry.npmjs.org/`, which is unsupported in
   this environment. Do not hand-edit an unverifiable lockfile or remove changes
   owned by another task.
5. Verify repaired manifests and lockfile with
   `mise exec -- pnpm install --filter . --filter ./core --filter "tsp-lintdiff-local-linter..." --frozen-lockfile --offline --ignore-scripts`
   when artifacts are cached; otherwise omit `--offline`. Repeat the affected
   build/import checks. If normalization or verification cannot be established,
   stop and report the blocker.
6. Never manually copy packages into `node_modules`, install unversioned global
   tools or silently bypass the lockfile. Correct understood local mistakes in
   place within the applicable budget, preserving failed-attempt evidence.
   External credential/network/disk/toolchain blockers, conflicting unrelated
   changes, unknown causes or exhausted allowances stop recovery; report the
   exact attempted repair and blocker rather than requesting a fresh worker.

### Promotion

Prepare the base environment before development without selecting a destination
or copying source. Verify common prerequisites and repository tooling. If absent,
run `mise exec -- pnpm install --ignore-scripts` in the promotion checkout.
Run full `mise exec -- pnpm install` only when an actual required validation
demonstrates that lifecycle outputs are missing. Do not prepare Python or other
unrelated lifecycle environments speculatively.

Require the selected package manager and repository validation tools to resolve
and `core` to match its gitlink. Destination-specific dependency builds and
native tests remain promotion work after destination selection; base-environment
readiness is not a claim that those checks passed.

## Durable readiness and revalidation

For an existing development worker, first verify the shared publication binding
and bounded checkout readiness without running resource creation. Require the
supplied source rule branch and the specs checkout at its pinned `specsCommit`,
with clean state or verified task-owned edits. A standalone worker without a
manifest records that baseline from observed state; it must not invent queue
ownership or create replacements. Queued workers require the supplied manifest.
Run the worker's semantic coverage gate before dependency verification/repair.

Fetch the intended development target through the verified canonical remote and
use its remote-tracking ref, never a same-named local branch. Apply the
untouched-branch fast-forward policy below when eligible. If task work already
exists, preserve it and verify that the diff from its merge base contains only
known task changes; commits present only on an advancing remote target are not
unrelated rule-branch changes. Record any base change and invalidate affected
readiness evidence.

Store the manifest outside tracked repositories, updating it after each action:

- task/rule, original input, effective worker command, preparation status,
  dispatch IDs, coordinator ID and exact paths to artifacts/logs
- resolved worktrees folder, target repository root/project, logical and physical
  containment evidence, and placement capabilities for any new app checkout
- development and promotion publication bindings, actual paths/branches,
  canonical base refs/SHAs, local and remote heads and app comparison bases;
  specs repository/path and pinned SHA
- per-phase publication operation (`create`/`update-existing`), verified existing
  PR tuple and any app comparison-base discrepancy excluded from diff selection
- setup owner acknowledgements, review capabilities/routes, completion channels,
  original readiness/operation deadlines and verified quiescence
- submodule SHAs, tool versions, hashes of tool configuration, relevant manifests
  and lockfiles, dependency profile results, build/input identity and smoke checks
- task-owned unfinished changes and hashes; existing PR and retry histories
- authoritative skill files and referenced contracts, with absolute paths and
  content hashes; each owner acknowledges these versions before task work

Pin the coordinator's instruction versions in durable artifacts when necessary,
including development, promotion, review and their referenced contracts. Owners
invoke the named skills, then apply this supplied version set as invocation
context when their checkout contains older instructions. Never copy these skills
into either rule PR. Missing/unreadable or unexpectedly changed instruction
artifacts block dispatch; do not silently fall back to an older `main` version.

At every phase handoff and repair resumption, verify identities, task-owned
content and the manifest fingerprint. Reuse passing layers only when their
inputs still match; repair/rebuild only invalidated layers and retain prior
evidence. Do not rerun whole preparation to recover a publication failure.

For a new, untouched branch only, the owner may fast-forward to a freshly fetched
canonical base if the existing HEAD is an ancestor and it has no task changes or
commits. Record the new base SHA and invalidate affected submodule/dependency/
build evidence before continuing. Never reset/rebase or advance a branch with
task work. In particular, early promotion preparation does not authorize taking
a newer source tip: its source is always the exact reviewed, pushed development
commit supplied at promotion dispatch.
