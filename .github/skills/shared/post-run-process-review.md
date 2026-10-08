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
  the outer agent may authorize the consolidated skill-update publication, after every
  queue entry and review loop is terminal.
- Ownership here is decision ownership. When publication is app-session-bound,
  that orchestrator delegates ONE skill-only publication to a verified dedicated
  app owner under the shared preflight; the owner performs edits and the required
  creation call, while the orchestrator coordinates and verifies. Do not create
  a second PR from the coordinator or run a recursive post-run update.
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

Review the stops as well as the final result. For each human intervention,
record the blocker immediately before it, what the user actually supplied
(access, authorization, technical information or a changed requirement), and
what action made progress possible afterward. Distinguish active execution time
from waiting for the user. Successful completion does not erase a repeatable
workflow defect: if unchanged content passed the same required gates and later
proceeded through corrected policy selection alone, inspect contradictory
instructions and backend-specific rules applied outside their scope. Preserve
real permission and required-validation gates; do not generalize one user's
explicit retry allowance into unattended retry permission.

## Independent skill-only PR

For qualifying improvements:

1. Apply the reusable
   [publication preflight](../do-linter-development-task-one-by-one/app-session-execution.md#publication-preflight)
   before edits or expensive setup. Resolve the remote for `Azure/typespec-azure`, fetch its
   `feature/lintdiff-migration-new` branch explicitly, and verify that remote
   ref exists. This is the required base regardless of the primary workflow's
   PR target. Do not fall back to `main` or a stale local branch.
2. Establish the dedicated owner/branch and clean worktree from that fetched ref
   using the selected backend. For app-session tools, create the app owner with
   the explicit migration base and a setup-only handoff FIRST; verify its actual
   root/branch/base and bounded readiness before authorizing edits. Do not create
   an ordinary worktree and discover publication incompatibility afterward. Leave
   primary rule, promotion, and review worktrees untouched. Do not carry over
   primary-workflow commits or cherry-pick a mixed commit.
3. Read the current skills and supporting documents in that worktree and
   recheck the evidence gate. Skip improvements already present or no longer
   applicable. Change only relevant skill instructions and supporting skill
   documentation under `.github/skills/`, including this shared policy when
   justified. Explicitly authorized supporting skill helper code/tests may also
   change there; this is not permission for rule/package work. Update
   contradictory references together.
4. Perform the lightweight validation below, then stage explicit file paths
   and create a dedicated skill-only commit. Do not include rule code or rule tests,
   package docs, logs, generated output, submodule changes, dependency files,
   or release/change entries.
5. Push a new dedicated branch to canonical `Azure/typespec-azure` (retain the
   head branch when recovering an existing canonical skill PR) and open an independent PR
   against `Azure/typespec-azure` with base
   `feature/lintdiff-migration-new` explicitly selected, following the
   publication targeting guidance below. Describe the observed evidence,
   rationale, affected skills, and narrow validation in the PR body. Do not
   add skill changes to the primary task's PR.
6. Verify the created PR's base, head, and complete file list. All changes must
   be skill instructions, supporting skill documentation, or authorized helper
   code/tests. Do not report
   successful completion if the PR target or scope is wrong.

If the base is unavailable, the correction is unsafe, or publishing fails,
stop the skill-update attempt without asking the user or modifying the primary
workflow's result. Report a concrete operational blocker briefly when a
qualifying update could not be published. Never merge the PR automatically.

### Publication targeting

Use the shared contract's
[publication checks](../do-linter-development-task-one-by-one/app-session-execution.md#publication-checks)
and [duplicate-safe recovery](../do-linter-development-task-one-by-one/app-session-execution.md#publication-recovery),
not a separate fallback policy. Skill source branches must be in
`Azure/typespec-azure`, never a personal fork; the base is
`feature/lintdiff-migration-new` in that same repository. Existing canonical
skill PRs retain their head branch. A legacy fork-backed PR requires explicit
user-authorized migration before proceeding; do not silently replace it.
Separate Git tracking/push/base
hints from the independently verified app binding. A stale deletion count with
clean Git and correct binding is not a missing base or a creation failure.

Preserve complete failed attempt evidence and intended tuple. Reconcile an exact
existing PR; only proven absence plus a specific correctable configuration defect
permits the single required-tool correction/retry. Never infer the cause from
HTTP 422 or retry an ambiguous transport/API failure. A required-tool fallback
needs that tool's explicit failure permission. Publication-only recovery reuses
matching validated work without restarting development or post-run review.
If blocked, preserve the branch and report the missing control, whether creation
was attempted, and the exact tuple separately from the primary workflow's result.

## Lightweight validation and CI

- Inspect the complete diff against the fetched base and the staged file list.
  Check Markdown references, ownership rules, and contradictory instructions.
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
