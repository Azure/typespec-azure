# Publication execution backends

Use this shared contract for development preparation and standalone workers,
standalone and queued promotion, authorized follow-up repair, publication-only
recovery, and post-run skill PRs. It changes execution and publication ownership,
not eligibility, semantic coverage, validation, or source immutability. It adds
no public command-line options. Queue-only dispatch and completion requirements
do not apply to a standalone owner reporting directly to its user.

## Publication preflight

Before expensive investigation, edits, dependencies or builds, classify the
[lifecycle](#lifecycle-and-reuse), select the backend below, and record one
publication binding in durable session artifacts:

- task/lifecycle and authorization; owner identity and absolute worktree root
- app project/session IDs when applicable, actual Git and app head branch, HEAD,
  index/worktree status and readiness evidence
- canonical base repository, fetched base ref and SHA, intended base branch,
  and independently inspected app comparison `base_ref` and merge base
- head repository/owner, head branch, expected remote SHA, recorded PR if any,
  exact push remote URL/refspec, and publication tool/backend/capabilities
- Git upstream (`branch.<name>.remote`/`merge`), effective push destination
  (explicit command remote/refspec, otherwise `branch.<name>.pushRemote`,
  `remote.pushDefault` and tracking fallback, with `remote.<name>.push` and
  `push.default` ref selection),
  and `branch.<name>.gh-merge-base`, each separately
- for delegated work only, coordinator, dispatch/result identity and a verified
  completion channel; for reviews, selected owner and persistent capabilities

Resolve repository identity from actual remote fetch/push URLs and GitHub
metadata, never a remote's name. New dedicated heads default to the user's
personal fork; `Azure/typespec-azure` supplies the fetched base. Existing verified
task PRs retain their recorded head repository, including canonical heads; do not
move them to a fork. Promotion targets canonical `main`; migration and skill PRs
target the explicitly selected migration branch. Examples using `origin` mean
the verified canonical fetch remote; substitute its actual name when different.

Git upstream controls tracking, push settings control push routing, and
`gh-merge-base` is a CLI base hint. None changes an app session's comparison or
publication binding. Record prior values and rationale before any task-local
tracking/pushRemote/gh-merge-base adjustment; do not change global defaults or
unrelated branches. Verify the effective destination afterward. A valid Git diff
does not compensate for a missing/wrong app base. If no supported control can
establish the required binding, preserve the work and stop before setup.

## Lifecycle and reuse

Classify before applying merged-PR or reuse gates; titles are leads, not identity:

- **Initial migration:** use the rule's eligibility and semantic-coverage gates.
  A verified merged migration stops duplicate migration.
- **Repair on a recorded OPEN PR:** preserve its worktree, head repository,
  branch, base and history; verify current SHA/ownership before focused repair.
  Closed/merged or externally changed state blocks this repair mode.
- **Separately authorized follow-up source repair:** an explicit user request
  naming the post-merge defect and scope permits a new repair, not reopening the
  merged PR or repeating migration. Preserve the old work; establish a new
  authorized repair branch/owner from the intended canonical target. Reapply
  eligibility, semantic coverage, native-boundary and validation requirements;
  covered/uncertain behavior is not waived. Use the
  [repair skill](../lintdiff-rule-reimport-repair/SKILL.md) for source investigation.
  This is not a queue repair cycle; never invent a queue marker to authorize it.
- **Publication-only recovery:** validated completed work needs publication or
  reconciliation, not another discovery/development run. Pin its content, commit,
  dependency/tool context, validation requirements and prior attempt evidence.
  Reuse validation only when these still match; changes invalidate affected
  checks. Preserve the branch and use [publication recovery](#publication-recovery).

Legacy ownership adoption is a separate explicitly authorized operation below,
not any of these lifecycle classes or permission to transfer commits, replace
worktrees, reset budgets or ignore failed validation. Stop prior task activity
before any reuse or new authorized work.

## Bounded checkout readiness

Allow at most **10 minutes from session creation** for provisioning, or from the
first readiness inspection only when creation time is unavailable. Record the
original start/deadline and do not reset it on
resumption. Use bounded read-only checks of session root/branch/base, Git HEAD,
index population (`git ls-files`), staged and unstaged diffs, full status including
untracked files, and any active provisioning status. A path appearing or an
empty index alone is not readiness. Do not start dependencies during checkout.

For a new checkout require the expected fetched HEAD, populated matching index,
clean full Git status and the correct app root/branch/comparison-base binding.
For resumed work require the recorded content/ownership manifest instead of
discarding expected edits. Clean Git plus verified app comparison binding can
establish readiness even when a changed-file overview still shows stale mass
deletions; record that discrepancy and recheck actual Git before editing.
Missing/wrong binding cannot be excused as a stale display.

At the deadline, return terminal `checkout-readiness-blocked` with timestamps,
session identity, HEAD/index/status evidence and last provisioning result.
Never reset, restore, clean, move or recreate a checkout merely to clear the UI.
Before another task starts, apply the quiescence gate in
[completion reconciliation](#completion-delivery-and-reconciliation).

## Select the backend

- Use `app-session` when the required PR-creation tool publishes the current app
  session's branch and does not accept explicit repository/base/head targeting.
  A general-purpose subagent and `Set-Location` do not establish that binding.
- Use `explicit-target` only when the environment permits a publication tool
  that explicitly selects the intended repository, base and head independently
  of the coordinator's session. Do not assume that installed `gh` authorizes
  bypassing a required integrated tool.
- In app-session mode, require session inspection and change-base inspection,
  plus session creation when a new owner is needed. Delegated workflows also
  require session messaging and completion delivery. If unavailable,
  report `publication-context-unavailable` before setup or development. Do not
  silently downgrade to a known incorrectly bound publisher.

## Dispatcher preparation

Preparation remains preparation-only. Do not start development, a review loop,
promotion or PR creation here.

1. After the existing eligibility gate and target fetch, identify the configured
   local repository project for `Azure/typespec-azure`. Use `list_projects`;
   do not pick a different project just because it has the same repository.
   Prefer the current matching repository project.
2. Discover existing sessions before creating one. Reuse only a recorded,
   idle, task-owned development session whose branch, worktree, repository and
   comparison base match this rule. Do not take over unrelated user activity.
3. For a new rule, call `create_session` in that project with
   `workspace_type: "worktree"`,
   `base_branch: "<target-branch>"`, `coordinate_with_creator: true`, and
   `notify_on_idle: "always"`. Omit `kickoff` so rule work cannot race setup.
   The base is `feature/lintdiff-migration-new` for this queue, never the
   project's default `main`.
4. Record the returned session ID immediately. Use `get_session` for its actual
   branch and path, and `get_changes_overview` for its `base_ref`. Apply
   [bounded checkout readiness](#bounded-checkout-readiness) before editing or
   dependencies; retain the first inspection time across setup messages.
5. Give the owner a setup-only message using `send_session_message` with
   `mode: "autopilot"` and `delivery_mode: "immediate"`. Instruct it to verify its
   own root and dedicated branch, use the app's `rename_branch` to retain the
   `lintdiff-<validator-rule-slug>` suffix if needed, report the resulting
   identity, and stop. No dependency work, rule edits, PR or review is allowed
   in that message. Do not rename the branch behind the app with shell Git.
6. Re-read the session metadata and base after setup. The worktree must be
   separate from the target checkout, the head must not be the target branch,
   and its starting commit must match the fetched target. A named local base
   can lag the fetched remote: during preparation only, the owner may
   fast-forward its clean, newly created branch to that recorded remote commit
   if it has no task commits and is an ancestor. Never move the target branch,
   reset an ahead/diverged branch, or assume session creation fetched it.
   Recheck HEAD afterward and report any remaining mismatch before dependencies.
   Use the actual
   app-returned worktree path, even if its directory has an app-generated name.
   Never move it to the old dispatcher naming pattern.
7. Prepare the separate pinned specs worktree and complete the existing
   dependency checks in these exact paths. Generate the original worker command
   with the app-owned TypeSpec path and preserve the specs path. Return the
   command plus the publication binding below; leave the owner idle.

Store the binding in the dispatcher's durable session artifacts, not in a
tracked repository file. Include it in the handoff text so another queue session
can discover the owner through the supported session tools. Keep this metadata
outside the copyable commands-only block; the queue input grammar is unchanged.
Copying only the commands is sufficient: exact worktree-path matching through
the session tools recovers the owner and project, and change-base inspection
recovers the base without requiring access to the dispatcher's artifacts.

```text
backend: app-session
rule_id: <exact-rule-id>
project_id: <repository-project-id>
development_session_id: <owning-session-id>
typespec_worktree: <app-returned-absolute-path>
specs_worktree: <isolated-specs-absolute-path>
repository: Azure/typespec-azure
base_branch: feature/lintdiff-migration-new
canonical_base_ref: <verified-canonical-remote>/<target-branch>
base_sha: <fetched-commit>
head_repository: <personal-fork-owner>/typespec-azure
head_branch: <app-recorded-rule-branch>
push_remote_url: <verified-personal-fork-push-url>
publication_tool: <required-tool>
```

## Preflight and existing worktrees

For the `explicit-target` backend, verify that the permitted creation tool can
select the requested repository/base/head independently for every task; no app
session binding is required. The remainder of this section applies to
`app-session` execution.

For queues, after complete parsing and catalog eligibility, resolve each TypeSpec
path to exactly one idle, task-owned app session using the handoff and
`list_sessions_and_chats` / `get_session`. Normalize Windows paths
case-insensitively. Confirm repository, head branch, worktree and comparison
base (`get_changes_overview`), not just the session's title.

Both owning-session IDs and worktree paths must be unique across queue tasks.
A development binding's base must be `feature/lintdiff-migration-new`; a
promotion binding's base must be `main`. A known wrong base, a head equal to the
base, a session already attached to an unrelated PR, or a missing/ambiguous
binding is `publication-context-unavailable`. Read-only preflight does not
fetch, fast-forward, install dependencies or inspect future tasks' rule code.
Leave Git preflight and synchronization to the development skill.

Standalone owners verify their own exact binding through the same controls;
they do not need a coordinator or completion automation. For delegated work,
also establish completion delivery to the current coordinator, not just the
dispatcher that originally created the session. `notify_on_idle` notifies the
creator; sending a message does not subscribe a different coordinator.
Require the reconciliation mechanism below when reusing another creator's
session. If it cannot be established without replacing an unrelated automation,
report `completion-channel-unavailable` before development.

For old commands referencing ordinary Git worktrees, do not silently create a
replacement session, rewrite the supplied command/path, check out the source
branch elsewhere, or transfer commits. Registration of a folder as a project
does not prove PR-base ownership. Reuse an existing exact owner only if its
binding can be established; otherwise preserve all work and fail that entry at
preflight. Only explicit user authorization permits the legacy adoption below;
a queue reinvocation is not permission to create a replacement checkout.

### Authorized legacy-worktree adoption

Use this recovery path only when the user explicitly authorizes establishing
app-session ownership for the named existing worktree. It does not authorize
resetting correction budgets; any additional correction must independently meet
the queue's [bounded-resumption contract](SKILL.md#explicitly-authorized-bounded-resumption).

1. Stop prior task agents/commands before adoption. Record the authorization,
   canonical absolute path, repository/remotes, branch, HEAD, submodule state,
   staged/unstaged patches, and hashes of all task-owned new/changed files in
   durable artifacts. Match the previous handoff and stop on unexplained changes.
2. Search session and project inventories for the exact path, not just repository
   name. Reuse a matching idle owner only if it has the expected branch and no
   unrelated PR/activity. If absent, use `create_project` with the existing local
   `path`, not a clone URL. Verify the returned project uses that exact path.
3. Create an idle local session in that project with `workspace_type: "branch"`,
   `coordinate_with_creator: true`, and `notify_on_idle: "always"`. Omit kickoff
   and `base_branch`: for branch sessions the latter selects a checkout, not the
   PR comparison base. In particular, passing `main` would switch away from the
   preserved promotion branch. Never create another worktree, rename the branch,
   stash, reset, or move files as part of adoption.
4. Independently read `get_session` and `get_changes_overview`. Require the exact
   path, branch, repository, and comparison base (`main`/`origin/main` for
   promotion; the migration target for development). Recheck HEAD, index and
   file hashes against the pre-adoption manifest. Project registration or a
   default-branch field alone does not establish the publication binding.
5. If comparison-base correction is needed, use only a supported app control
   that changes comparison metadata without checking out another branch. If none
   is available, stop with the exact missing control; do not edit app databases,
   infer success from Git tracking settings, or bypass the required PR tool.
6. Send the verified owner a setup-only message to confirm its path, unchanged
   manifest and publication binding, then remain idle. Establish completion
   delivery for delegated work using the procedure below. Record project/session IDs and evidence
   in the handoff. Resume task work only after every remaining gate is satisfied,
   including a current-head development review before promotion.

Adoption is not a source-repair cycle or proof that PR creation succeeded. Do not
archive the adopted session: its existing checkout and unfinished work must be
preserved. The owning session must itself publish and verify the resulting PR.

## Queue execution

The outer queue owns phase progression and the ledger. In app-session mode,
the owning session's main agent executes a phase directly; it is not a
publication proxy for a full-cycle subagent running in the coordinator.

1. Persist a unique dispatch ID, task, cycle, phase scope, expected branch/HEAD,
   owning session ID, absolute result-artifact path and complete handoff before
   messaging. Establish the completion channel below. Send the development
   owner the development-phase prompt below with `mode: "autopilot"` and
   `delivery_mode: "immediate"`. Do not use the default plan mode.
2. Wait for its result through session notifications/messages, not polling
   sleeps or a second worker. On a notification, inspect the session and its
   structured result. An idle notification alone is not phase completion.
   Match dispatch ID, task, cycle, owner and expected phase, and verify its PR
   identity, pushed head and review evidence. Ignore duplicate completed
   notifications; never resend an in-flight dispatch merely because it is quiet.
   A `review-handoff` is not completion: verify owner quiescence and run the
   selected outer-owned review route below. Its review phase must be the declared
   boundary of the dispatched phase (`development-review` for development,
   `promotion-review` for promotion); retain the original dispatch identity.
3. If the owner is unexpectedly paused on a plan, read it using `get_session`.
   Approve only an in-scope plan using `respond_to_session_plan` with the
   `autopilot` continuation, or reject it with the required correction. Do not
   ask the user for routine phase approval or approve destructive/out-of-scope
   actions. Missing results or errors require status reconciliation, not
   assumptions of success.
4. Only after clean development review and all development agents/commands have
   stopped task work, create the promotion owner if absent. Use the same
   project and app worktree procedure, but `base_branch: "main"` and a
   `promote-lintdiff-<validator-rule-slug>` branch suffix. Promotion's existing
   canonical `origin/main` verification and source immutability still apply.
   Record and verify this second binding before promotion dependencies or edits.
   Do not branch the promotion session from the development branch.
   This also applies after outer-owned development review: keep the development
   owner idle and dispatch a DISTINCT promotion owner, never resume development
   into promotion or create its source PR from the coordinator.
5. Send the promotion-phase prompt with the exact reviewed, pushed source SHA
   and both bindings. The promotion owner invokes the promotion skill in its
   already-created worktree; do not let that skill create a third checkout.
   Wait for and verify the promotion result as for development.
6. Apply the queue's existing success, blocker and source-repair classifications.
   A confirmed source defect permits only the existing bounded repair cycle.
   Wait for all prior phase activity to stop, then send a new development-phase
   dispatch to the same development owner. After clean source review, send a
   new promotion-phase dispatch to the same promotion owner. Reuse both PRs
   and worktrees; use fresh review subagents for every review-loop invocation.
7. Advance to the next rule only after this task is terminal. Never archive a
   source or promotion session during the queue: archiving can remove its
   worktree, which is needed for repairs and the final handoff.

Session IDs persist across repair cycles; dispatch IDs do not. The explicit-target
backend's fresh-cycle-subagent rule does not apply to these retained app owners.
The initial cycle plus at most three source repairs, independent five-round
review limits and single-active-task rule remain unchanged. The prohibition on
automatic operational retries has only the narrow task-local
[publication correction exception](#publication-recovery), not a workflow
restart. The outer queue alone owns post-run skill suggestions/updates.

### Completion delivery and reconciliation

Every phase owner writes its structured result to the supplied unique absolute
artifact path outside tracked repositories before sending it to the current
coordinator with `send_session_message` (`delivery_mode: "immediate"`). Include
the dispatch ID and result path in that message. On receipt, the coordinator
reads the artifact and verifies the evidence before marking the dispatch complete.

For owners created by another session, use a coordinator session automation
as a recovery channel; creator-only idle notifications are insufficient.
Inspect `get_session_automation` first. If no automation exists, register one
with `save_session_automation`, `interval: "minutes"`, `every_minutes: 10`,
and a prompt that reconciles only the ledger's in-flight dispatches and durable
result artifacts. Record that automation's ownership in the ledger. Never
replace an unrelated automation or use a workflow that starts a new context.
If these tools are unavailable or the slot is occupied, fail preflight rather
than dispatching work whose completion cannot be observed reliably.

On reconciliation, consume a matching complete result if available. Otherwise
inspect the existing owner, command status and append-only log. A new milestone,
advancing output or changed command-status evidence establishing actual work
constitutes genuine busy progress; a `busy` label, unchanged running status or
timestamp-only heartbeat does not. After 10 minutes
without such evidence, send ONE status request for that dispatch ID, explicitly
not a phase restart. Record its time and allow one further 10-minute reconciliation
window. If progress or a valid result is still absent, mark `owner-stalled` and
request task quiescence, retaining the missing-status and last-command evidence.
An advancing long-running operation is not stalled just because no phase result
exists; its own deadline still applies.

Before any next task or phase, independently establish that the old owner,
nested agents and tracked commands have stopped task activity. Request a stop
and verify acknowledgements/status/process completion using supported controls
and exact IDs. Allow at most a further 10 minutes for that confirmation. If
unavailable or unresponsive, return `quiescence-unverified` and STOP THE QUEUE,
leaving later entries pending; never overlap a timed-out owner. Idle alone is
not success or proof its detached commands ended. Preserve unfinished work,
and never kill unrelated processes or archive a worktree to force quiescence.
Record deadlines durably; notifications/automation drive these finite checks,
not infinite sleep loops or replacement workers. Clear only the queue-owned
automation when dispatches are terminal or the queue is stopped with unresolved
activity explicitly reported; clearing a timer is not proof of quiescence.

## Phase-scoped owner prompts

Include the original command verbatim, the complete cycle handoff, the queue's
logging and heartbeat requirements, both bindings when known, the coordinator
session ID, unique result-artifact path, and absolute paths to the coordinator's
current skill instructions.
Include exposed persistent launch/follow-up capabilities and selected review
owner (`worker` or `outer`), as established by the queue's
[capability preflight](SKILL.md#review-capability-preflight-and-handoff).
The target branch (especially `main`) can contain older instructions: read the
supplied versions as invocation context, without copying skills into either PR.
Invoke the named skills through the skill tool, never as shell executables.

**Development owner**

> You own only development and development review for this dispatch, directly
> in your app-owned source worktree. Invoke the supplied `/develop-lintdiff-rule
--worker ...` command, reusing the recorded development PR during repair.
> Your main session agent owns PR creation; do not delegate the complete phase
> or its creation call to a coordinator subagent. If review owner is `worker`,
> invoke `/loop-for-fix-and-review <verified-development-pr-url>`. If it is
> `outer`, return `review-handoff` with `phase: development-review`, capability
> evidence, PR/pushed SHA and validation manifest, then remain idle while the
> coordinator runs its fresh review pair. Do not promote or
> create a promotion session. Stop all delegated task activity and return the
> structured development result to the coordinator with `send_session_message`.

**Promotion owner**

> You own only promotion and promotion review for this dispatch. Invoke
> `/lintdiff-rule-promote <rule-id>` with both bindings, your supplied promotion
> worktree and the exact cleanly reviewed source SHA. Reuse your app-owned
> promotion worktree even on cycle 0; never create another checkout or change
> the source worktree. Your main session agent owns promotion PR creation.
> After required validation and a verified PR, invoke `/loop-for-fix-and-review
<verified-promotion-pr-url>` only when review owner is `worker`. Otherwise return
> `review-handoff` with `phase: promotion-review`, pinned source provenance and
> the complete handoff, then remain idle during the coordinator's separate pair.
> A confirmed source defect returns evidence to
> the coordinator; do not repair source or start another cycle. Stop all
> delegated task activity and return the structured promotion result using
> `send_session_message`.

Each result includes dispatch ID, task/rule, cycle, phase, both applicable phase
outcomes, session/worktree binding, PR repository/base/head/SHA, review rounds
and termination evidence, pinned source SHA for promotion, absolute shared log
path, blocker or source-defect evidence, and unfinished task-owned state.
Include capability evidence, selected review owner, pending review phase, review
invocation/agent IDs, reviewed SHA and final pushed SHA (or explicit `not run`).
For outer review, the coordinator verifies and records these results; it sends
the verified source SHA to the promotion owner, not a promotion instruction to
the development owner. Select the route before side effects; never switch
review owners after a failure or reuse a review pair/budget across invocations.
Keep no-skill-edits/no-skill-update-PR constraints in both prompts and all
subagent handoffs. Each review loop may use its two required nested agents.

## Publication checks

Immediately before creation, the owner rechecks its app metadata, comparison
base, local head, intended push repository and remote head. The source owner
targets `Azure/typespec-azure:feature/lintdiff-migration-new`; the promotion
owner targets `Azure/typespec-azure:main`. Both use their own distinct branches
as heads, according to the delegated skills' publication policy.

Query existing PRs by exact repository/head/base before creation, following
[publication recovery](#publication-recovery) for duplicate-safe reconciliation.
The
required integrated tool must be called by the actual owning session, not by
the outer queue. A required-tool fallback is permitted only when that tool's
failure explicitly authorizes it; availability of `gh` is not authorization.

After creation, independently verify the actual GitHub base repository/branch,
head repository/branch, head SHA, draft status and complete file scope. A
returned URL alone is not success. On a mismatch, record the incorrect PR and
stop without starting review, promotion, another creation attempt or silently
closing someone else's PR. Do not retarget to `main` to make creation succeed.

Session/base preflight addresses the known shared-parent-context failure; it
does not prove a future network request will succeed. Do not describe this
backend as end-to-end demonstrated until correctly targeted development and
promotion draft PRs have actually been created and verified from their owners.

## Publication recovery

This is reconciliation of one task's publication, not an operational retry loop
or permission to restart its workflow. Preserve the complete original tool
arguments, response/error, attempt/time identity, local and pushed SHA, intended
base repo/branch and head repo/owner/branch, app binding and relevant Git settings
in durable evidence (redact credentials only).

1. Before creation and after any ambiguous or failed response, query the EXACT
   target repository for open PRs with the fork-owner-qualified head and exact
   base. Fully paginate; independently verify returned base repository/branch,
   head repository/branch, state, head SHA, draft status and complete file scope.
   Do not rely on a title, branch name without owner, or search snippets.
2. An exact matching open PR at the expected pushed SHA is reconciled as the
   existing result, not created again. Multiple candidates, a mismatched head,
   a closed/merged recorded PR, failed/incomplete query, or uncertain identity
   stops publication. Preserve unexpected PRs; do not silently close/retarget them.
3. Only after a successful complete query POSITIVELY establishes absence, allow
   at most ONE documented task-local configuration correction and ONE retry
   through the REQUIRED creation tool, and only when evidence identifies a
   specific correctable configuration defect. Record original values, exact
   causal defect, correction, verification and retry identity. A bare HTTP 422
   establishes no particular defect: do not blindly set upstream, pushRemote
   and gh-merge-base together. Git hints cannot repair wrong app binding.
4. Unknown/ambiguous transport outcomes, API/auth/network failures, mismatched
   identities, query failures and repeated creation failures remain blockers,
   even if a later query is empty. Reconciliation may find a successful PR, but
   it does not authorize resending an indeterminate request. Never retry pushes
   or review requests under this exception. Recheck absence immediately before
   an eligible retry and verify the actual PR afterward as above.

Keep this one-correction budget per task/publication identity across resumptions,
separate from worker attempts, setup retries, source repairs, draft corrections
and review rounds. Neither a fresh dispatch nor publication-only recovery resets
it. If blocked, retain validated work and report the exact tuple, attempts,
query evidence and missing control; do not fall back to another base or tool.
