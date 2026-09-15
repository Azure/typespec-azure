# Publication execution backends

Use this contract from `develop-lintdiff-rule` preparation and worker mode and
from `do-linter-development-task-one-by-one`. It changes where a phase executes,
not what counts as successful development, promotion, or review. It adds no
public command-line options.

## Select the backend

- Use `app-session` when the required PR-creation tool publishes the current app
  session's branch and does not accept explicit repository/base/head targeting.
  A general-purpose subagent and `Set-Location` do not establish that binding.
- Use `explicit-target` only when the environment permits a publication tool
  that explicitly selects the intended repository, base and head independently
  of the coordinator's session. Do not assume that installed `gh` authorizes
  bypassing a required integrated tool.
- In app-session mode, require session creation, session inspection, change-base
  inspection, session messaging and completion notifications. If unavailable,
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
   `workspace_type: "worktree"`, `execution_location: "local"`,
   `base_branch: "<target-branch>"`, `coordinate_with_creator: true`, and
   `notify_on_idle: "always"`. Omit `kickoff` so rule work cannot race setup.
   The base is `feature/lintdiff-migration-new` for this queue, never the
   project's default `main`.
4. Record the returned session ID immediately. Use `get_session` for its actual
   branch and path, and `get_changes_overview` for its `base_ref`. Wait for app
   worktree provisioning to finish before inspecting Git cleanliness or editing:
   a path or session ID appearing is not proof that checkout is complete.
   A transient deleted-file view during checkout is not permission to restore,
   reset, clean or recreate the worktree. Report a provisioning failure rather
   than running dependencies against a partially populated checkout.
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
head_branch: <app-recorded-rule-branch>
```

## Preflight and existing worktrees

For the `explicit-target` backend, verify that the permitted creation tool can
select the requested repository/base/head independently for every task; no app
session binding is required. The remainder of this section applies to
`app-session` execution.

After complete queue parsing and catalog eligibility, resolve each TypeSpec
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

Also establish completion delivery to the current coordinator, not just the
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
preflight. Recovery of already-developed branches requires its own explicitly
authorized workflow, not an automatic queue retry.

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
review limits, no automatic operational retries, and single-active-task rule
remain unchanged. The outer queue alone owns post-run skill suggestions/updates.

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
inspect the existing owner and log, and request status addressed to the same
dispatch ID without instructing it to rerun the phase. Do not overlap work,
assume that idle means success, or resend a creation request. Surface confirmed
errors as blockers; stale activity needs status evidence, not a second worker.
The timer is for recovery, not a shell sleep/poll loop. Clear only the
queue-owned automation once every task and in-flight phase is terminal.

## Phase-scoped owner prompts

Include the original command verbatim, the complete cycle handoff, the queue's
logging and heartbeat requirements, both bindings when known, the coordinator
session ID, unique result-artifact path, and absolute paths to the coordinator's
current skill instructions.
The target branch (especially `main`) can contain older instructions: read the
supplied versions as invocation context, without copying skills into either PR.
Invoke the named skills through the skill tool, never as shell executables.

**Development owner**

> You own only development and development review for this dispatch, directly
> in your app-owned source worktree. Invoke the supplied `/develop-lintdiff-rule
--worker ...` command, reusing the recorded development PR during repair.
> Your main session agent owns PR creation; do not delegate the complete phase
> or its creation call to a coordinator subagent. Then invoke
> `/loop-for-fix-and-review <verified-development-pr-url>`. Do not promote or
> create a promotion session. Stop all delegated task activity and return the
> structured development result to the coordinator with `send_session_message`.

**Promotion owner**

> You own only promotion and promotion review for this dispatch. Invoke
> `/lintdiff-rule-promote <rule-id>` with both bindings, your supplied promotion
> worktree and the exact cleanly reviewed source SHA. Reuse your app-owned
> promotion worktree even on cycle 0; never create another checkout or change
> the source worktree. Your main session agent owns promotion PR creation.
> After required validation and a verified PR, invoke `/loop-for-fix-and-review
<verified-promotion-pr-url>`. A confirmed source defect returns evidence to
> the coordinator; do not repair source or start another cycle. Stop all
> delegated task activity and return the structured promotion result using
> `send_session_message`.

Each result includes dispatch ID, task/rule, cycle, phase, both applicable phase
outcomes, session/worktree binding, PR repository/base/head/SHA, review rounds
and termination evidence, pinned source SHA for promotion, absolute shared log
path, blocker or source-defect evidence, and unfinished task-owned state.
Keep no-skill-edits/no-skill-update-PR constraints in both prompts and all
subagent handoffs. Each review loop may use its two required nested agents.

## Publication checks

Immediately before creation, the owner rechecks its app metadata, comparison
base, local head, intended push repository and remote head. The source owner
targets `Azure/typespec-azure:feature/lintdiff-migration-new`; the promotion
owner targets `Azure/typespec-azure:main`. Both use their own distinct branches
as heads, according to the delegated skills' publication policy.

Query existing PRs by exact repository/head/base before creation. Reuse only
the recorded matching open PR at the expected head; reconcile any ambiguous
creation response by querying GitHub before considering another send. The
required integrated tool must be called by the actual owning session, not by
the outer queue. Only an environment-authorized fallback is permitted.

After creation, independently verify the actual GitHub base repository/branch,
head repository/branch, head SHA, draft status and complete file scope. A
returned URL alone is not success. On a mismatch, record the incorrect PR and
stop without starting review, promotion, another creation attempt or silently
closing someone else's PR. Do not retarget to `main` to make creation succeed.

Session/base preflight prevents the known shared-parent-context failure; it
does not prove a future network request will succeed. Do not describe this
backend as end-to-end demonstrated until correctly targeted development and
promotion draft PRs have actually been created and verified from their owners.
