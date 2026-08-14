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

To continue one dispatched rule interactively in another session, use worker
mode with the paths reported by the dispatcher:

```text
/develop-lintdiff-rule --worker ParametersInPointGet --typespec-worktree C:\dev\worktrees\lintdiff-parameters-in-point-get --specs-worktree C:\dev\worktrees\azure-rest-api-specs-lintdiff-parameters-in-point-get --target-branch feature/lintdiff-migration-new
```

## Modes

### Dispatcher mode

An invocation without `--worker` is preparation-only, whether it contains one
or multiple rule IDs. The current session creates and verifies isolated
branches and worktrees, then reports the commands needed to open each rule in
a new VS Code window and start its interactive worker. It must not launch a
subagent, investigate the rule, install dependencies, prepare the comparison
harness, edit, validate, commit, or create a PR.

For every prepared rule, return both:

```powershell
code -n <typespec-azure-worktree>
```

```text
/develop-lintdiff-rule --worker <rule-id> --typespec-worktree <typespec-azure-worktree> --specs-worktree <azure-rest-api-specs-worktree> --target-branch <target-branch>
```

After opening the new VS Code window, the user starts a new top-level chat and
runs the reported worker command. Worker mode resumes from the existing branch
and worktrees without recreating them.

### Worker mode

An invocation with `--worker` handles exactly one rule interactively. Verify
that the supplied typespec-azure worktree is on the rule branch, the supplied
specs worktree is at the pinned `specsCommit`, and both are clean except for
known in-progress changes for that rule. Skip branch and worktree creation,
prepare dependencies and the fixture comparison harness as described below,
then execute the Development workflow. Never accept multiple rule IDs in
worker mode and never delegate the complete workflow to a development
subagent.

## Orchestration

The dispatcher must isolate each requested rule before handing it back to the
user for interactive development.

When the user requests multiple rules, treat them as independent development
units. For each rule, create a distinct rule branch, typespec-azure worktree,
and azure-rest-api-specs worktree. Create and verify the worktrees serially to
avoid competing large checkouts. The user may then open the worktrees in
separate VS Code windows and run independent top-level worker sessions.

1. Treat the user-supplied branch as the target branch, not as the
   rule-development branch.
2. Create a new rule-specific branch from the target branch. Its name must
   identify the lint rule, for example
   `feature/lintdiff-latest-version-common-types`.
3. Create a dedicated typespec-azure worktree for that rule branch. If the
   current worktree was created for the target branch, do not put the rule
   commit directly on that branch.
4. Read the pinned `specsCommit` from
   `packages/typespec-lintdiff/specs/_meta.json`.
5. Create a separate azure-rest-api-specs worktree at that commit. Concurrent
   rule-development workers must not share a writable specs checkout because
   the existing runner links packages and may change the checked-out revision.
6. Verify both worktrees exist at the expected branch or commit and are clean.
7. Report the rule ID, target branch, rule branch, both absolute worktree paths,
   the `code -n` command, and the exact worker-mode invocation.

Do not install dependencies, run `compare:setup`, or resolve package links in
dispatcher mode. Those operations belong to the interactive worker and may
modify its isolated worktrees.

## Worker setup

Before starting the Development workflow, the top-level worker must prepare
its supplied worktrees:

1. Ensure the specs worktree is clean and install its existing dependencies.
2. Prepare the fixture comparison harness. Either:
   - run `pnpm --dir packages/typespec-lintdiff compare:setup -- --specs-repo
     <isolated-specs-worktree>`, or
   - set and verify `LINTDIFF_VALIDATOR_ROOT` and `LINTDIFF_COMMON_TYPES`
     against existing local checkouts.
   Do not assume a fresh rule worktree already contains
   `test/azure-openapi-validator` or `test/common-types`.
3. Verify that the specs worktree's local
   `node_modules/tsp-lintdiff-local-linter` resolves directly to the supplied
   typespec-azure worktree. `compare:setup` uses a shared global npm link, so a
   setup in another worker can redirect this specs worktree to the wrong rule
   build. Repair any collision with a direct per-worktree link before running
   validation, and do not run `compare:setup` concurrently with another
   worker.

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

### 2. Implement the focused rule change

When evidence requires a rule update:

- change the production TypeSpec rule
- add directly related violating, compliant, and regression fixtures
- update snapshots and fixture `rule.md`
- update the rule's `migration.md`

Do not change Swagger validator code, emitters, or unrelated TypeSpec rules.

### 3. Run focused validation

Run the narrowest existing fixture tests, package build, and package lint
commands that cover the changed rule. Fix failures before running the corpus.

### 4. Run the existing corpus analysis

Use the existing full runner; do not add a per-rule runner:

```powershell
pnpm --dir packages/typespec-lintdiff specs:typespec -- `
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
3. Confirm the remaining diff contains only the production TypeSpec rule and
   directly related fixtures, snapshots, tests, and migration note.
4. Stage explicit rule-related paths. Never use a broad command that could
   include refreshed coverage data.

Canonical coverage is rebuilt separately and serially on the target branch
after rule PRs merge.

### 7. Run an independent code review

Before committing or creating the PR, the main agent must assign the complete
rule-related diff to a separate code-review subagent.

The reviewer must:

- compare the rule branch against the user-supplied target branch
- inspect the production rule, fixtures, snapshots, `rule.md`, and
  `migration.md`
- check for semantic misses, false positives, incorrect TypeSpec compiler API
  usage, version/projection mistakes, unstable diagnostic targets, ineffective
  deduplication, and misleading diagnostics
- verify that fixture evidence covers the implementation's important branches
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

### 8. Commit, push, and create the draft PR

Finishing validation is not the end of this skill. The top-level worker must
complete the GitHub handoff unless the user explicitly asks to stop before
creating a draft PR.

1. Confirm the current branch is the dedicated rule-specific branch and is
   based directly on the user-supplied target branch.
2. Confirm neither the rule commit nor generated coverage data was added to the
   target branch.
3. Commit only the explicit rule-related paths identified above.
4. Push both the target branch and rule branch to the `origin` repository.
5. Create the pull request in the `origin` repository as a **draft**, with the
   rule branch as head and the user-supplied target branch as base. Do not mark
   it ready for review; the user decides when the migration evidence and rule
   behavior are ready for formal review.
6. Write the PR description as an engineering explanation, not only a change
   list. It must emphasize:
   - **Why the TypeSpec rule changed:** describe the Swagger behavior, the
     former TypeSpec behavior, concrete real-service misses or false positives,
     and the evidence proving that these are semantic rule gaps rather than
     report-population or validator-data artifacts.
   - **How the rule was changed:** describe the semantic targets now inspected,
     important compiler or library APIs used, version/projection handling,
     diagnostic targeting and deduplication decisions, and why the design
     matches intended Swagger behavior.
   - **What was deliberately not copied:** identify validator defects, stale
     maps, emitted-occurrence duplication, or other discrepancies excluded
     from the TypeSpec implementation.
   - **How the behavior is proven:** summarize focused violating and compliant
     fixtures, former real-service misses now covered, latest full-corpus
     counts, one-sided project explanations, compile failures, and remaining
     uncertainty.
   - **PR scope:** confirm generated coverage files are excluded and identify
     the rule-related files included.
7. Prefer concrete examples, project names, and before/after evidence. Avoid a
   generic bullet such as “improve parity” without explaining the actual
   missing semantic behavior.
8. Return the PR URL as the rule's final workflow result.

## Guardrails

- In dispatcher mode, the current session only creates and verifies branches
   and worktrees and reports handoff commands. It must not perform setup or rule
   development and must not launch development subagents.
- Never develop multiple rule PRs in one worktree.
- Maintain a one-to-one mapping between each rule, rule branch, typespec-azure
   worktree, azure-rest-api-specs worktree, and top-level worker session.
- Never share a writable specs worktree between concurrent workers.
- Never allow two specs worktrees to resolve
   `node_modules/tsp-lintdiff-local-linter` to the same rule worktree.
- Worker mode must reuse and verify the supplied worktrees; it must not create
   replacements or dispatch another agent to own the complete workflow.
- Stop if either worktree has unrelated changes before the workflow starts.
- Surface compile, projection, linking, and corpus failures explicitly.
- Do not silently omit failed projects from the conclusion.
- Do not commit `packages/typespec-lintdiff/specs` changes in the rule PR.
- Keep required changes focused on the TypeSpec rule and directly related
  tests.
- Do not stop after validation when the requested workflow includes a draft PR.
- Do not skip independent review because focused tests or corpus coverage pass.

## Deliverable

Dispatcher mode returns only:

- per-rule preparation status, target branch, rule branch, and both absolute
   worktree paths
- the `code -n` command and exact worker-mode invocation for every rule
- any branch or worktree preparation failure that prevents handoff

Worker mode returns:

- for each rule, whether and how the TypeSpec rule changed
- per-rule focused fixture evidence
- per-rule full-run project overlap and one-sided project lists
- per-rule compile failures or remaining uncertainty
- per-rule review findings adopted and rejected, with reasons
- the explicit rule-related files ready for each PR
- each created draft PR URL
