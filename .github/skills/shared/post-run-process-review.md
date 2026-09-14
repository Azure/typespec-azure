# Shared post-run process review

Read and follow this policy when a skill reaches its post-run process review.
Use the invoking skill's review topics to identify concrete improvements, but
do not ask the user whether to adopt them.

## Ownership and timing

- Finish or stop the primary workflow before making post-run skill changes.
  Never change orchestration instructions during an active review/fix loop.
- For a standalone run, the orchestrating agent owns the post-run review and
  any skill-update PR. Review and fix subagents return evidence to that agent;
  they do not create their own skill-update PRs.
- Under `/do-linter-development-task-one-by-one`, workers and their delegated
  skills only return evidence-backed, high-confidence suggestions to the outer
  queue agent. Pass this ownership constraint to every delegated skill. Only
  the outer agent may create the consolidated skill-update PR, after every
  queue entry and review loop is terminal.
- Deduplicate suggestions by root cause and proposed change, retaining each
  source task and its evidence. Create at most one skill-update PR per completed
  standalone run or queue.

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

## Independent skill-only PR

For qualifying improvements:

1. Resolve the remote for `Azure/typespec-azure`, fetch its
   `feature/lintdiff-migration-new` branch explicitly, and verify that remote
   ref exists. This is the required base regardless of the primary workflow's
   PR target. Do not fall back to `main` or a stale local branch.
2. Create a dedicated branch and clean worktree from that fetched ref. Leave
   primary rule, promotion, and review worktrees untouched. Do not carry over
   primary-workflow commits or cherry-pick a mixed commit.
3. Read the current skills and supporting documents in that worktree and
   recheck the evidence gate. Skip improvements already present or no longer
   applicable. Change only relevant skill instructions and supporting skill
   documentation under `.github/skills/`, including this shared policy when
   justified. Update contradictory references together.
4. Perform the lightweight validation below, then stage explicit file paths
   and create a dedicated skill-only commit. Do not include rule code, tests,
   package docs, logs, generated output, submodule changes, dependency files,
   or release/change entries.
5. Push the dedicated branch to the personal fork and open an independent PR
   against `Azure/typespec-azure` with base
   `feature/lintdiff-migration-new` explicitly selected, following the
   publication targeting guidance below. Describe the observed evidence,
   rationale, affected skills, and narrow validation in the PR body. Do not
   add skill changes to the primary task's PR.
6. Verify the created PR's base, head, and complete file list. All changes must
   be skill instructions or supporting skill documentation. Do not report
   successful completion if the PR target or scope is wrong.

If the base is unavailable, the correction is unsafe, or publishing fails,
stop the skill-update attempt without asking the user or modifying the primary
workflow's result. Report a concrete operational blocker briefly when a
qualifying update could not be published. Never merge the PR automatically.

### Publication targeting

- Record the intended base repository and branch, personal-fork owner, and
  pushed head branch before choosing the publication tool. Git upstream
  tracking, `branch.<name>.gh-merge-base`, and an app session's comparison base
  are separate settings; changing one does not prove the others changed.
- When creating an app-native worktree session for this PR, explicitly pass
  `base_branch: "feature/lintdiff-migration-new"` rather than accepting the
  project's default branch. Confirm the resulting session's base before
  preparing changes. Do not assume registering an existing worktree as a
  project or branch session preserves its intended PR base.
- Where the environment permits GitHub CLI PR creation, select both branches
  explicitly: use `gh pr create --repo Azure/typespec-azure --base
feature/lintdiff-migration-new --head <fork-owner>:<skill-branch>` with the
  reviewed title and body. Do not rely on inferred defaults.
- Honor the environment's PR-creation tool requirements. If an integrated
  tool is required, inspect its available targeting controls and supported
  fallback before proceeding; this skill does not authorize bypassing those
  requirements. A skill change cannot add a missing tool parameter.
- A mismatched app change overview is a warning, not evidence that GitHub
  rejected a PR or that the creation tool necessarily uses that same base.
  Inspect the actual skill-only diff against the fetched base. Resolve the
  publication target through supported controls; do not knowingly publish
  against `main`, or report a creation failure when no attempt was made.
- After creation, query the PR's actual base repository/branch, head
  repository/branch, and complete file list. If explicit targeting cannot be
  established, preserve the pushed branch and report the missing control,
  whether creation was attempted, and the exact intended base/head separately
  from the primary workflow's outcome.

## Lightweight validation and CI

- Inspect the complete diff against the fetched base and the staged file list.
  Check Markdown references, ownership rules, and contradictory instructions.
- Use existing formatting tooling only on changed skill documents and run
  `git diff --check`. Follow a configured documentation-specific check if one
  applies; do not run repository-wide formatting or source linting for a
  Markdown-only skill update.
- Do not initialize submodules, install the monorepo dependency closure, build
  packages, regenerate docs, or run unit/corpus/integration suites merely for
  this PR. If formatting tooling is unavailable, report that limitation instead
  of doing expensive environment setup.
- Let normal CI run. Do not wait for all jobs, repeatedly poll or rerun CI, or
  investigate unrelated CI failures. Never bypass required checks or change CI
  configuration to make this PR pass.
- Do not invoke `/loop-for-fix-and-review` for the skill-update PR, restart the
  completed primary workflow, or recursively run this post-run policy on its
  own update.

## Final handoff

If a skill-update PR was created, include its link and a brief description of
the improvement alongside the primary task's result. Put detailed evidence in
the PR, not a user-facing list of suggestions. If no improvement passed the
confidence gate, say nothing about discarded suggestions or the absence of a
skill-update PR. Keep any skill-update publishing blocker separate from the
primary task's outcome.
