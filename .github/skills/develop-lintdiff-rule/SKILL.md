---
name: develop-lintdiff-rule
description: Develop or correct one migrated Swagger LintDiff rule in an isolated worktree, validate it with the existing full TypeSpec corpus runner, and prepare a PR containing only the TypeSpec rule and directly related tests.
argument-hint: "[Swagger validator rule ID]"
user-invocable: true
---

# Develop one migrated LintDiff rule

Use this skill to implement or correct one migrated Swagger validator rule in
`packages/typespec-lintdiff`.

The normal invocation names the Swagger validator rule:

```text
/develop-lintdiff-rule LatestVersionOfCommonTypesMustBeUsed
```

## Orchestration

The main agent must isolate each rule development before delegating it.

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
   rule-development subagents must not share a writable specs checkout because
   the existing runner links packages and may change the checked-out revision.
6. Ensure the specs worktree is clean and has its existing dependencies
   installed.
7. Delegate the investigation, implementation, and validation to one subagent.
   Provide the rule ID and both absolute worktree paths.

## Development workflow

The delegated subagent works only in the supplied typespec-azure worktree.

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

### 7. Commit, push, and create the PR

Finishing validation is not the end of this skill. The main agent must complete
the GitHub handoff unless the user explicitly asks to stop before creating a
PR.

1. Confirm the current branch is the dedicated rule-specific branch and is
   based directly on the user-supplied target branch.
2. Confirm neither the rule commit nor generated coverage data was added to the
   target branch.
3. Commit only the explicit rule-related paths identified above.
4. Push both the target branch and rule branch to the `origin` repository.
5. Create the pull request in the `origin` repository with the rule branch as
   head and the user-supplied target branch as base.
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
8. Return the PR URL as the final workflow result.

## Guardrails

- Never develop multiple rule PRs in one worktree.
- Never share a writable specs worktree between concurrent subagents.
- Stop if either worktree has unrelated changes before the workflow starts.
- Surface compile, projection, linking, and corpus failures explicitly.
- Do not silently omit failed projects from the conclusion.
- Do not commit `packages/typespec-lintdiff/specs` changes in the rule PR.
- Keep required changes focused on the TypeSpec rule and directly related
  tests.
- Do not stop after validation when the requested workflow includes a PR.

## Deliverable

Return:

- whether and how the TypeSpec rule changed
- focused fixture evidence
- full-run project overlap and one-sided project lists
- compile failures or remaining uncertainty
- the explicit rule-related files ready for the PR
- the created PR URL
