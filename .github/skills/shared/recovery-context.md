# Task-scoped recovery context

Use one durable context throughout preparation, development, promotion and each
review invocation. It is handoff metadata, not additional worker CLI flags or a
global preference. The outer queue owns it; standalone callers own their context.
Every dispatch carries the artifact path/content identity and acknowledges the
applicable settings before side effects.

## Explicit authorization, recorded once

Record the exact user authorization, task/rule scope, publication binding and
limits. Missing fields mean **not authorized**, never permission to infer an
exception. A permission survives a phase handoff only within its recorded scope:

| Field                         | Required scope and evidence                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `legacy_fork_update`          | Exact existing PR URL, base repository/branch, head repository/branch, verified ownership/push access, and user authorization to retain that fork head.                                           |
| `legacy_fork_worktree_create` | Exact existing development worktree, rule, head repository/branch/SHA, canonical base repository/branch, verified ownership/push access, and explicit authorization for its first development PR. |
| `post_merge_source_repair`    | Explicit permission to create follow-up source-repair PRs for confirmed defects within this named queue task and its existing three-cycle limit. Default false.                                   |
| `validation_profiles`         | Named package/worktree, test runner and configuration/dependency fingerprints, exact command/selection, ordinary and hook timeouts, and the source of authority for each nondefault setting.      |
| `budgets`                     | Original counters and failures for task-wide and phase/round allowances, including separately authorized finite recovery. Never reset them during handoff or publication rollover.                |

Do not ask the user to repeat an authorization that still matches. Reverify
current identities and content instead. Changed scope, an unexplained head, or
missing evidence is still a blocker. Permission to edit these skills is not
permission to restart a blocked rule task.

### Existing fork updates

An explicit `legacy_fork_update` permits `update-existing` for that exact PR
without migrating its head. Apply it consistently in development, promotion and
review preflights. Keep the verified canonical base, explicit fork push refspec,
worktree ownership and all review/validation gates. Do not change global remotes
or infer identity from a remote name.

This exception does **not** authorize a new fork branch/PR, a replacement PR, a
different rule, or a skill-update PR. New publications still use the canonical
head policy unless the user separately and explicitly authorizes their exact
publication scope. Skill-only PRs retain their canonical-head requirement.

### Existing fork worktree publication

An explicit `legacy_fork_worktree_create` permits the first development PR from
the recorded existing task-owned fork-backed worktree. Before setup, verify the
exact worktree, branch, local and remote state, ownership, push permission, and
canonical development base. Query existing PRs first; an existing PR must use
its verified lifecycle and `legacy_fork_update`, not this creation exception.
Record this authorization separately from worker-command arguments and retain
it across preparation, development, publication, and review handoffs.

After creation, record the exact PR identity and carry the same scoped permission
as `legacy_fork_update` for subsequent updates and reviews. This does not authorize
creating a replacement worktree or fork branch, successor PRs, promotion or
instruction-only fork PRs, retargeting, or closing an existing PR. Preserve all
containment, publication-binding, validation, review, and retry requirements.

## Reusable validation profiles

Before the first required test command, reconcile its settings with the current
repository configuration and any explicit task authorization. Record the exact
profile in the ledger and pass it to subsequent owners of that same package.
For example, an explicitly approved `--hookTimeout 30000` on one ARM task may
remain in that task's focused and full-suite commands when the authorization
covers both. It is not a repository-wide timeout default.

- Historical passing output is supporting evidence, not authorization to
  override today's configuration. Record whether a setting comes from current
  checked-in configuration or an exact user-approved exception.
- Preserve test population, skips, assertions and ordinary timeout. Different
  compiler/package worktrees require distinct profiles; never copy the source
  package's settings blindly into promotion.
- Reverify runner/configuration/dependency fingerprints after input changes.
  Invalidate affected validation evidence; do not discard the authorization or
  failed-attempt history. A materially incompatible profile needs a new explicit
  decision, not a silent fallback to defaults or a larger timeout.
- A profile does not authorize retrying a failed check. Preserve any finite
  one-rerun authorization separately; reusing a setting is not renewing that
  attempt allowance. The existing timeout-diagnosis policy still excludes hook
  failures from its automatic per-test diagnostic rerun.

## Opt-in post-merge source repair

This is a transition owned by the outer queue, **not** publication-error recovery
and not permission for a promotion reviewer to edit source semantics.

1. Require `post_merge_source_repair` authorization and a complete confirmed
   source-defect handoff. A review suggestion, uncertain finding or operational
   failure cannot initiate it. Confirm all old owners/commands have stopped and
   fewer than three source-repair cycles have started.
2. Re-fetch the recorded source PR. **OPEN:** use ordinary same-PR repair.
   **CLOSED without merge:** stop. **MERGED:** verify the exact old head,
   repository/base/head tuple, merge commit and current source worktree against
   the historical binding. A missing/deleted remote branch after a verified
   merge is allowed; an unexpectedly replaced branch is not.
3. Fetch canonical `feature/lintdiff-migration-new` explicitly. Verify the
   recorded merge is contained in that fetched target. Check that the relevant
   rule, tests and migration evidence match the reviewed source or have a
   completely explained merge-only adaptation. Unexplained overlapping changes
   stop the transition. Preserve the old branch and immutable source pin.
4. Persist a transition record with the predecessor PR/head, fetched base,
   defect/scope, proposed unique successor branch, publication backend and
   counters. Require a clean source worktree. Rebind the recorded development
   owner to a new branch from that fetched target under the full **new-creation**
   preflight. Verify Git and any app publication binding before edits.
   An unsupported owner rebind is a blocker, not permission to publish from
   another session, reset/rebase the old branch, or reuse its deleted remote ref.
   Keep the exact source/specs worktree paths and the effective worker command.
5. Increment the existing repair-cycle counter once when dispatching this
   repair. Restart at development with a fresh explicit-target worker, or a new
   development dispatch in the verified app owner. Scope the repair to the
   confirmed defect, including a reproducer/regression and ordinary eligibility,
   source validation, corpus/evidence and review requirements.
6. Create a new draft source-repair PR against the migration target, linking
   the predecessor and defect. It is a follow-up, not a replacement or reopened
   PR. New head policy remains canonical; an old fork-update exception does not
   carry over. Append the new identity to `source_pr_history` and set
   `active_source_pr` only after independently verifying publication. Never
   erase predecessor review outcomes, failures, or counters.
7. Only after clean review of the successor's exact pushed SHA, refresh the
   **same open promotion PR** incrementally, preserving its approved adaptations.
   Validate and run a fresh promotion review pair. Keep the prior pin as history.
   Closed/merged promotion PRs remain blockers; this transition cannot replace
   them. Do not merge either PR automatically or wait for a source merge.

Without the opt-in, retain the current stop and report the needed authorization.
An authorization may be recorded at queue entry or on an explicitly authorized
resumption; generic "continue" is not permission to create a follow-up PR.

## Bounded corrections and earlier regressions

Keep existing three-attempt draft/command correction budgets. Prefer tested
helpers and executable invariants over giving each command a new retry budget.
Corpus counts must distinguish source population, successfully compiled
population and selected comparison population rather than asserting equality.
Unknown cleanup paths, mismatched hashes, external failures and uncertain
publication remain hard stops.

For rules that traverse models, include cycles, shared sibling models, shared
models across operations, and imported diagnostic targets in the regression
matrix before source publication. State the intended diagnostic unit (unique
declaration or payload path) and assert counts and targets accordingly. Do not
automatically change a rule to path-local visitation solely to satisfy this
matrix; its semantics still require evidence.
