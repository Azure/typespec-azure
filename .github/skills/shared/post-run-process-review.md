# Shared post-run process review

Read and follow this policy when a skill reaches its post-run process review.
Use the invoking skill's review topics to identify concrete improvements, but
do not ask the user whether to adopt them.

## Ownership and timing

- Finish or stop the primary workflow before making post-run skill changes.
  Never change orchestration instructions during an active review/fix loop.
- For a standalone run, the orchestrating agent owns the post-run review and
  any skill-update commit. Review and fix subagents return evidence to that
  agent; they do not publish their own post-run changes.
- Under `/do-linter-development-task-one-by-one`, workers and their delegated
  skills only return evidence-backed, high-confidence suggestions to the outer
  queue agent. Pass this ownership constraint to every delegated skill. Only
  the outer agent may authorize the consolidated skill-update publication, after every
  queue entry and review loop is terminal.
- Ownership here is decision ownership. When publication is app-session-bound,
  reuse the verified owner of the selected development or repair PR. If that
  owner is another session, send it one post-run-only handoff after its task
  activity has stopped; the owner edits, commits, and pushes while the
  orchestrator verifies. Do not create a session, worktree, branch, or PR for
  the skill update, or run a recursive post-run update.
- Deduplicate suggestions by root cause and proposed change, retaining each
  source task and its evidence. Publish at most one consolidated skill-only
  commit per completed standalone run or queue.

## Evidence and confidence gate

Make an update autonomously only when there is a strong reason and high
confidence in the specific correction. Require all of the following:

- Concrete evidence from the run identifies an instruction defect or a
  repeatable improvement, not a speculative cause or personal preference.
- The proposed change directly addresses that evidence and has a clear benefit
  for future runs.
- The correction is narrow, consistent with the current target-branch
  instructions, and preserves safety, validation, and workflow guarantees.

Record the proposed change, observed evidence, impact, and source task for each
qualifying improvement. Do not weaken checks or hide failures to make a run
appear successful. Discard low-confidence suggestions from handoffs and final
responses; do not ask the user to evaluate them. If nothing qualifies, make no
changes and omit post-run suggestions and an empty process-review section from
the user-facing response.

## Commit to an existing development or repair PR

For qualifying improvements:

1. Select an existing **open development or repair PR** from this workflow
   whose base is exactly `Azure/typespec-azure:feature/lintdiff-migration-new`.
   Use the originating task's recorded source PR. For a consolidated queue
   update, select the first eligible recorded source PR in queue order and
   record that choice. A promotion PR targeting `main` is not eligible.
   If no eligible PR or its existing owner/worktree is available, report that
   blocker and stop the skill update. Do not create a replacement PR, reopen
   a closed PR, retarget a PR, or push directly to the migration target.
2. Apply the reusable
   [publication preflight](../do-linter-development-task-one-by-one/app-session-execution.md#publication-preflight)
   for that existing PR before edits. Verify its repository, base, head
   repository/branch, pushed SHA, and owner/worktree binding. Require a clean
   index and worktree at the recorded pushed head; do not discard unrelated or
   unfinished changes. Resolve the remote for `Azure/typespec-azure`, fetch its
   `feature/lintdiff-migration-new` branch explicitly, and verify that remote
   ref exists. Preserve the existing rule branch and history; do not reset,
   rebase, or merge merely to publish documentation.
3. Read the current target-branch skills and the selected worktree's versions,
   then recheck the evidence gate. Skip improvements already present or no
   longer applicable. Change only relevant skill instructions and supporting
   skill documentation under `.github/skills/`, including this shared policy
   when justified. Explicitly authorized supporting skill helper code/tests may
   also change there; this is not permission for rule/package work. Update
   contradictory references together. Leave promotion and other worktrees
   untouched.
4. Perform the lightweight validation below, then stage explicit file paths
   and append one skill-only commit to the existing PR's head branch. Do not
   amend rule commits or include rule code/tests, package docs, logs, generated
   output, submodule changes, dependency files, or release/change entries in
   this commit.
5. Reverify that the PR is still open with the same base/head and remote SHA.
   Push to its recorded head repository and branch with an explicit
   remote/refspec; do not move an existing canonical head to a fork. No
   PR-creation call is needed. Preserve the existing PR description and append
   a concise post-run section with the evidence, rationale, affected skills,
   commit, and narrow validation.
6. Verify the existing PR's base/head and new pushed SHA. Inspect the complete
   PR file list, but assess the **incremental skill commit** separately from
   the existing rule changes: that commit must contain only authorized
   `.github/skills/` paths. Record the pre-update reviewed rule SHA and final
   skill-only head separately. An earlier review does not cover the new head;
   do not rewrite review history or the promotion's immutable source SHA.

If the base is unavailable, the correction is unsafe, or publishing fails,
stop the skill-update attempt without asking the user or changing the primary
workflow's recorded outcome. Preserve any task-owned edits/commit and report a
concrete blocker. Never merge the PR automatically.

### Publication targeting

Retain the selected PR's existing publication binding and head repository,
whether canonical or a fork. The base must remain
`Azure/typespec-azure:feature/lintdiff-migration-new`; Git tracking/push/base hints
do not substitute for the independently verified PR and app binding.

Preserve failed attempt evidence and the exact tuple. Do not retry an uncertain
push, force-push over a changed remote head, or fall back to creating a separate
skill PR. Publication-only recovery may reuse matching validated work under
the shared recovery contract; it does not restart the primary workflow or
authorize an automatic network/publication retry.

## Lightweight validation and CI

- Inspect the incremental diff from the recorded pre-update head, the complete
  PR diff against the fetched base, and the staged file list. Keep existing
  rule changes out of the skill commit. Check Markdown references, ownership
  rules, and contradictory instructions.
- Format ONLY explicit changed files supported by the existing formatter and run
  `git diff --check`. Follow a configured documentation-specific check if one
  applies; do not run repository-wide formatting or source linting for a
  Markdown-only skill update. Never run `pnpm format` across the repo. Do not
  pass Python to a formatter without Python support; use configured focused
  Python checks when present.
- Do not initialize submodules, install the monorepo dependency closure, build
  packages, regenerate docs, or run package/corpus/integration suites merely for
  a documentation update. Explicitly authorized skill helper changes DO require
  their focused offline unit tests (for example, stdlib Python tests with
  mise-managed `python -X utf8`), not monorepo installation/builds. If formatting tooling is unavailable, report that limitation instead
  of doing expensive environment setup.
- Let normal CI run. Do not wait for all jobs, repeatedly poll or rerun CI, or
  investigate unrelated CI failures. Never bypass required checks or change CI
  configuration to make this PR pass.
- Do not invoke `/loop-for-fix-and-review` solely for this post-run commit,
  restart the completed primary workflow, or recursively run this policy on
  its own update. Report prior reviews against their actual SHAs. A later
  authorized workflow resumption must verify and review its current head
  normally before promotion.

## Final handoff

If a skill update was published, include the existing development or repair
PR link, the skill-only commit, and a brief description alongside the primary
task's recorded result. Distinguish its earlier reviewed head from the new
post-run head without claiming a fresh review. Put detailed evidence in the PR,
not a user-facing list of suggestions. If no improvement passed the confidence
gate, say nothing about discarded suggestions. Keep any skill-update publishing
blocker separate from the primary task's outcome.
