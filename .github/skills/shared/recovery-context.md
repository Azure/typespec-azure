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
  checked-in configuration, an applicable bounded recovery below, or an exact
  user-approved exception.
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

Keep existing three-attempt draft/command correction budgets and the separate
coordinator-owned reserve below. Prefer tested
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

### Coordinator-owned local recovery reserve

For queue tasks started under this contract, invocation also authorizes **three
additional local corrective attempts total per rule task**, shared across
development, promotion, reviews and source-repair cycles. This is a finite
reserve, not three more attempts per phase or failure. Standalone skills retain
their existing budgets. A historical task stopped under an older contract does
not gain this allowance merely because the skill file changed. Explicit user
limits narrower than these defaults take precedence.

Before a worker declares an exhausted local budget terminal, return
`local-recovery-handoff` to the coordinator, with all commands stopped. The
coordinator may grant one reserve attempt to the **same owner** without user
input only when all of these conditions hold:

- The ordinary allowance is exhausted, reserve remains, and a reproducer or
  command evidence proves an understood task-owned draft/invocation defect.
  Unknown causes, external failures and immutable promotion-source defects
  remain outside this path.
- The proposed correction changes the failed approach based on new evidence:
  identify the root cause, exact files/command, expected result and regression
  matrix. Do not repeat an unsuccessful patch or run an unchanged check hoping
  it passes. A wrapper's wrong hardcoded file count is a command defect, not
  missing user permission; derive and verify the actual explicit path set.
- Content hashes, index, ownership, applicable contracts and required validation
  scope are verified. No concurrent owner, unrelated edit or uncertain side
  effect may be hidden by the handoff.
- The coordinator records the original counters, evidence, decision and reserve
  debit **before** dispatch. One coherent correction plus its required validation
  consumes one attempt; a newly discovered failure needs a new eligibility
  decision and remaining reserve. No owner/phase/review restart resets it.

Rerun the original failed required scope and every invalidated check. A production
lint change still requires the normal corpus/native procedure and independent
review; promotion still preserves the pinned source. All publication gates
remain in force. Neither this reserve nor policy reconciliation permits retries
of network/authentication, review requests, publication, email or unknown
cleanup. When ineligible or exhausted, report the precise blocker rather than
asking the user for a generic "continue." Explicit finite resumption remains
available, but is not needed for an eligible reserve attempt.

### Bounded native baseline comparison

For queue tasks under this contract, a naturally completed required native suite
that still has **only per-test timeouts after the single reduced-concurrency
diagnostic** may return `native-comparison-handoff`. The coordinator owns **one
comparison allowance per rule task**, separate from the reserve and original
diagnostic. The same prospective-task and explicit-user-limit rules as the
reserve apply. It covers at most one focused baseline run, one focused draft run,
and one original-full-scope rerun, not an open-ended runner experiment.

1. Preserve both prior full runs, exact failing test IDs, skips, configured
   test/hook limits and input fingerprints. Require natural completion,
   quiescence and understood side effects. Hook/setup failures, assertions,
   crashes, killed/hung commands, corpus failures and external failures are
   ineligible. Do not diagnose these through the local reserve.
2. Before dispatch, record one supported alternate runner execution profile,
   its documented semantics and why it is appropriate to test. For example,
   inspect the installed Vitest version before selecting
   `--pool=threads --maxWorkers=1`; do not make this a universal default. Change neither
   timeouts, test selection/assertions/skips, dependencies nor production code
   to make the suite pass. A user-mandated execution profile cannot be overridden.
3. Verify an isolated baseline at the recorded pre-change commit and the
   restored draft against manifests, including compiled outputs actually loaded
   by the test. Use all remaining timeout test IDs and the same candidate profile once
   for each. Safe reversible isolation must preserve staged/untracked work
   byte-for-byte, without reset/stash or discarding files; if that cannot be
   established, stop. A comparison using stale draft runtime is not a baseline.
4. Only if both focused runs pass and exact draft restoration is verified, run
   the original full suite once with that profile. Require identical test IDs,
   skip set and timeouts, and zero failures. Focused passes never replace this
   gate. A failure at any stage ends the allowance, not another pool trial.
5. Retain all failures and passing evidence. Report a recovered timeout with
   **unproven original cause**, not an environmental diagnosis. Persist the
   passing package-scoped profile for later phases with fresh fingerprints;
   that profile does not renew any retry allowance.

The coordinator records eligibility, profile, isolation/restoration plan and
allowance debit before the same owner executes. No publication is allowed until
the full required scope passes. A confirmed source defect still follows the
source-repair protocol, never a promotion-only semantic fix.

### Local recovery decision cases

| Case                                                                                                   | Expected outcome                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Three local attempts used; new reproducer proves an in-scope metadata-filter defect; reserve available | Coordinator grants one recorded correction to the same owner, without user input.                           |
| Formatter wrapper rejects an incorrect expected count before formatting                                | Verify side effects and exact path set; use ordinary correction or one reserve attempt, never a free retry. |
| Same semantic patch failed again with no new causal evidence                                           | Do not grant reserve merely to repeat it.                                                                   |
| Required suite retains only per-test timeouts after reduced concurrency                                | Consider the single baseline-comparison allowance; no timeout increase.                                     |
| Baseline passes but draft focused run fails, or restored runtime cannot be verified                    | Stop comparison; no full rerun or success claim.                                                            |
| Both focused runs pass but full scope fails or changes test IDs/skips                                  | Required gate remains blocked; no second comparison.                                                        |
| Required hook timeout, permission denial or indeterminate push                                         | Neither local reserve nor native comparison applies.                                                        |
| Owner/phase changes or a historical task reloads newer skills                                          | Preserve counters; no replenishment or retroactive recovery grant.                                          |
