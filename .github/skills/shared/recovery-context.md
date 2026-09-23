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

| Field                      | Required scope and evidence                                                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `legacy_fork_update`       | Exact existing PR URL, base repository/branch, head repository/branch, verified ownership/push access, and user authorization to retain that fork head.                                      |
| `post_merge_source_repair` | Explicit permission to create follow-up source-repair PRs for confirmed defects within this named queue task and its existing three-cycle limit. Default false.                              |
| `validation_profiles`      | Named package/worktree, test runner and configuration/dependency fingerprints, exact command/selection, ordinary and hook timeouts, and the source of authority for each nondefault setting. |
| `budgets`                  | Original counters and failures for task-wide and phase/round allowances, including separately authorized finite recovery. Never reset them during handoff or publication rollover.           |

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

## Validation gates and supplemental checks

Before executing validation, record each command's exact scope, input identity,
authority and gate level: `required` or `supplemental`. Required includes checks
mandated by the user or applicable repository/phase instructions. A user's
explicit "publish only if this passes" condition is a required gate, even for a
normally optional command. A retry allowance by itself does not change a gate's
level. Carry this plan and all results across owners; do not infer gating from
a command's name, breadth, exit code or the word "blocker" in an old summary.

For promotion, affected native checks are required; the optional final
`validate:pr` run is supplemental unless separately required. Generic "stop on
validation failure" and "never publish a failing draft" rules prohibit failed
required gates and task defects; they do not silently make every supplemental
check mandatory.

| Evidence                                                                                                                                                  | Disposition                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Required check fails, is incomplete, or no longer matches the draft                                                                                       | Block publication; apply only an existing eligible correction/recovery allowance.             |
| Any check reveals a task-caused defect, or a failure plausibly involving changed behavior remains unclassified                                            | Block publication; investigate and use the applicable correction or immutable-source handoff. |
| Predeclared supplemental check fails or reaches its deadline, all required checks still pass on the final draft, and triage finds no task-relevant defect | Preserve the failure as a validation limitation and continue without rerunning it.            |
| Gate authority, failure scope, current content, or command quiescence cannot be verified                                                                  | Return the exact missing evidence; do not assume a nonblocking result.                        |

Supplemental triage inspects the actual failed step, locations and relevant
changed code/dependencies, not just package names. Record why required evidence
remains applicable, the exit or termination status, counts and any unknown cause.
A setup-hook timeout outside required coverage may remain unexplained; do not
claim baseline reproduction or an environmental cause without evidence. It is
not an eligible automatic timeout rerun. A plausible task regression still
blocks regardless of which command found it.

Report retained supplemental failures in the PR and final result. Continuing
with that disclosed limitation is neither a passing full suite nor a retry;
it consumes no correction budget. Do not repeatedly run optional suites seeking
green, increase timeouts, skip tests, or fix unrelated code. A failed required
check cannot be demoted after the fact, and missing prior classification must
not be filled in opportunistically.

## Read-only blocker reconciliation

Before declaring a terminal stop or requesting renewed permission, the
coordinator checks the original operation, evidence and applicable contract.
Do not require the user to debug policy selection. Separate these cases:

- **Actual permission/capability missing:** name the repository, operation and
  unsupported control or denied access. Previously verified access is not a
  blocker merely because an earlier summary says "authorization required."
- **Already permitted continuation:** verified explicit-target worktree reuse,
  an unattempted publication after its preflight obstacle is resolved, or a
  disclosed supplemental limitation may permit the next unfinished step.
  Verify their specific contracts; do not rerun a failed command.
- **A new exception or retry is needed:** preserve the stop and exact finite
  authorization required. Generic "continue" or "give access" does not increase
  a retry budget, override a user-imposed gate, permit app ownership adoption,
  or authorize resending a failed/indeterminate publication.

Workers may return `policy-reconciliation-handoff` with commands stopped, the
current draft identity, gate authority, preserved results/counters and the
proposed next step. The coordinator resolves it once from read-only evidence.
Record a corrected classification separately from the original stop. Continue
the same idle phase owner only if the next action was already authorized and
no failed required gate, task defect or side-effect uncertainty remains. This
does not launch a fresh worker, reset counters, renew deadlines or retry an
external operation. Otherwise retain the normal stop and recovery policy.

Use these decision cases when reviewing changes to the contracts:

| Case                                                                                   | Expected outcome                                                            |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Clean, recorded CLI task worktree; no PR attempt; explicit targeting now available     | Verify reuse and creation binding; continue without app adoption.           |
| Ownerless worktree needs an app-session creation binding                               | Require authorized app adoption; CLI presence is not a bypass.              |
| Optional broad run times out; exact required checks pass; no task-linked failure found | Disclose the limitation and continue; no automatic full-suite retry.        |
| Same run was explicitly required by the user                                           | Remain blocked until the required gate is satisfied or the user changes it. |
| Required test fails, even in apparently unrelated setup                                | Preserve the failed gate and bounded recovery policy.                       |
| Supplemental assertion demonstrates a source-rule defect                               | Return source-repair evidence; do not patch only the promoted copy.         |
| PR creation response is indeterminate and the exact query is empty                     | Do not resend; preserve publication-recovery stop.                          |
| Content changes or prior owner activity is uncertain                                   | Invalidate affected evidence or stop; do not reuse by path/name alone.      |

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
