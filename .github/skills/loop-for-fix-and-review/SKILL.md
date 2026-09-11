---
name: loop-for-fix-and-review
description: "Iterate on a pull request with two persistent subagents: one requests and collects GitHub Copilot reviews in Balanced mode, and one independently evaluates and fixes valid review findings. Use when the user wants a bounded Copilot review-and-fix loop until no new valid comments remain."
argument-hint: "<pull request URL or number>"
user-invocable: true
---

# Loop for Copilot review and fixes

Run a bounded review-and-fix loop for an existing pull request. Use exactly two
persistent subagents with separate responsibilities:

- **Review subagent:** requests Copilot reviews and collects comments from the
  newly completed review by numeric review ID.
- **Fix subagent:** analyzes every unresolved or newly created comment, adopts
  only valid findings, and validates the changes. It commits and pushes them
  only after explicit publication approval from the parent agent.

The parent agent orchestrates handoffs and tracks loop state. It must not treat
Copilot comments as automatically correct.

## Skill immutability during the loop

Treat this skill as orchestration input, not as part of the target pull
request's review/fix scope.

- Do not edit, commit, or push this skill while a review/fix loop is active,
  even when a round exposes a process weakness.
- Record process weaknesses and optimization ideas in the loop ledger for the
  post-run process review. They must not trigger a fix round or another Copilot
  review.
- Comments about this skill are out of scope for the target pull request unless
  the user explicitly made the skill itself the target deliverable before the
  loop started.
- Finish or stop the target loop first. Review all recorded process feedback
  once, after termination, instead of modifying the skill between rounds.

## Required input

Accept either:

- a full GitHub pull request URL
- a pull request number when the current repository is the target repository

If neither is available, ask the user for the pull request URL or number.

## Pull request modes

Classify the target before creating subagents:

- **standard PR mode** applies to ordinary pull requests, including lintdiff
  rule-development or repair pull requests.
- **promotion PR mode** applies when the semantic PR diff promotes a rule from
  `packages/typespec-lintdiff` into an official TypeSpec Azure library under the
  `/lintdiff-rule-promote` workflow. Detect promotion candidates from the files
  and behavior in the PR diff independently of whether their recorded lintdiff
  source provenance is complete; do not infer promotion mode from a title or
  label alone. A promotion candidate with missing or unverifiable provenance is
  a blocker, not a standard PR.

In promotion PR mode, the promoted library copy is a handoff from an immutable
lintdiff source rule. Review fixes may correct promotion adaptation, native
tests, documentation, generated official-library references, ruleset
registration, or change metadata. They must not silently change the source
rule's semantics only in the promoted copy.

## Loop limits

- Run at most **five review/fix rounds**.
- Drain all unresolved Copilot review threads before the first round. This
  backlog pass does not count as a review/fix round.
- A round starts only when a Copilot review is requested after the unresolved
  backlog is empty.
- Stop earlier when the new review has no comments or when the fix subagent
  finds no valid actionable comments.
- Treat GitHub Copilot's completed-review declaration that it generated no new
  comments as the review outcome. After the parent verifies that the
  review-specific comment endpoint is empty and no unresolved Copilot threads
  remain, end the loop immediately. Do not inspect suppressed-comment details,
  send them to the fix subagent, change the reviewed head, or request another
  review.
- If the fifth round still produces valid findings, finish and push that
  round's valid fixes, then stop and report that the cap prevented another
  verification review.
- Stop immediately on an unverified review request, indeterminate collector
  failure, validation failure, corpus failure, push failure, or finding whose
  validity cannot be determined safely. Report the blocker instead of silently
  continuing. The only exception is the bounded, parent-authorized
  [local collector recovery](#local-collector-recovery) below; it never permits
  an agent to silently resume or erase a failed attempt.

## Initialize

1. Resolve the pull request to its canonical URL, repository, number, base
   branch, head branch, head repository owner, and current head SHA:

   ```bash
   gh pr view "$PR" --json url,number,state,isDraft,baseRefName,headRefName,headRepositoryOwner,headRefOid
   ```

2. Confirm the pull request is open.
3. In standard PR mode, confirm the current worktree is the pull request's head
   branch and has no unrelated changes. Do not overwrite, discard, or include
   unrelated work.
   In promotion PR mode, the orchestrating session may start in another
   worktree or a folder outside the target checkout. Discover an existing local
   promotion worktree from the available repository worktree or workspace
   inventory and pin its absolute path as the `target worktree`. Require that
   target worktree to be checked out at the pull request's head branch and head
   SHA, with a completely clean index and working tree. If no such worktree can
   be discovered, stop immediately and report that an existing local promotion
   worktree is required. Do not create a worktree, check out the promotion
   branch in another worktree, invoke `/lintdiff-rule-promote` to reconstruct
   one, or otherwise prepare promotion state as part of this loop. If a
   candidate target worktree has any local changes, stop and report its path and
   changed files. Do not clean, stash, overwrite, or include those changes.
   After pinning the path, run every promotion filesystem inspection,
   validation, edit, commit, and push explicitly in that target worktree; never
   rely on the orchestrating session's current directory.
4. In promotion PR mode, resolve and record the immutable lintdiff source rule,
   source branch or ref, source commit, and migration evidence identified by the
   promotion PR. If this provenance is missing or cannot be verified, stop as a
   blocker rather than guessing the source behavior.
5. Create the two persistent subagents once in background mode so the parent can
   deliver later rounds with `write_agent`. A sync-mode task is not persistent
   for this workflow and must not be used. Pin the fix subagent to
   `gpt-5.6-sol`; do not allow automatic model selection or substitution for
   that role. The review subagent does not require this model pin. Reuse the
   same agents in every round so each retains its prior context. Before
   processing backlog comments or requesting a review, verify that both agent
   IDs accept follow-up messages; if either does not, stop before GitHub or
   worktree side effects.
6. Maintain a round ledger containing:
   - pull request mode: `standard` or `promotion`
   - absolute target worktree path in promotion PR mode
   - promotion source provenance when applicable
   - round number
   - head SHA reviewed
   - pre-request and post-request timeline request-event cursors, including the
     event ID and timestamp or an explicit `none`
   - Copilot's requested-reviewer state immediately before and after the
     request attempt
   - request verification result: `new-verified`,
     `already-pending-active`, or `failed-or-unverified`
   - verified request-event ID and timestamp, and the PR head SHA to which the
     active request applies
   - raw evidence for every review poll and the mandatory final refetch,
     including UTC poll time, HTTP status or error, useful rate-limit metadata,
     raw response body or durable hash, and every parsed review candidate's
     `id`, login, state, `submitted_at`, and `commit_id`
   - ordinary-poll and final-refetch outcomes, Copilot review ID and submission
     timestamp, and any reliability classification
   - comment IDs delivered to the fix subagent
   - validity decision for each comment
   - promotion finding category when applicable
   - planned validation scope, command results, and corpus applicability/results
   - publication handoff identity and the parent's approval or rejection
   - pushed fix commit SHA
   - processed review-thread IDs and their final resolution state
   - any local collector failure, its original evidence, recovery eligibility,
     the parent's one-time recollection authorization, fresh evidence identity,
     and final recovery approval or rejection

## Local collector recovery

A visible comment is not by itself permission to resume an unverified request.
However, a proven local parsing, result-shape, or display-encoding bug need not
discard an otherwise verifiable review. Distinguish failed evidence collection
from failed display of successfully saved evidence; neither permits automatic
resumption. This exception applies only to collection and evidence display,
never to finding validity, validation, corpus runs, staging, commits, or pushes.

1. **Pause on failure.** Preserve the original command, exit/error, raw
   responses and ledger entry. Report to the parent. Do not request another
   review, send findings to the fix agent, change the head, resolve threads, or
   label the failed attempt successful.
2. **Parent eligibility gate.** Permit at most one recovery attempt per round
   only when preserved raw API evidence conclusively identifies a local
   timestamp-conversion or result-shape bug, or a display-only encoding failure
   after the bundled collector exited successfully and saved a complete
   `result.json`. For display-only failures, record the failing output command,
   its encoding/error, and the successful collector's separate exit status and
   artifact identity. A decode error while reading API data or a failure to save
   evidence is not a display-only failure. The raw responses must be valid,
   complete and successful, with trustworthy pre/post request evidence proving
   a new request-event cursor on the same head (or the already-recorded active
   pending-request provenance). Missing evidence, genuinely unverified requests,
   invalid source timestamps, API/auth/rate-limit failures, failed or incomplete
   pagination, stale heads, and unknown failure causes remain hard stops.
3. **Authorize read-only recollection.** Record the parent's authorization
   with the original failure identity, immutable request event/time and head.
   Use the bundled [collector](collector.md), not a patched copy of an ad-hoc
   collector. Do not edit skill instructions or helper code during the active
   loop. If the bundled helper itself needs repair, stop and repair it after
   termination. The parent performs one independent, fresh, fully paginated,
   no-cache recollection into a new evidence directory. Use UTF-8 execution and
   the collector's structured `review_metadata`, not the failed display script.
   Display-only recovery uses the same one-attempt budget and all remaining
   checks; it does not request another review.
4. **Re-establish all evidence.** Verify the current head, numeric completed
   review ID, exact review commit and UTC submission/request correlation,
   review-specific REST comments and review metadata, and complete GraphQL
   mapping/unresolved state. If the review is not yet complete, the recollection
   fails; do not restart a polling deadline or use recovery to wait indefinitely.
   Any disagreement, missing evidence, or second collector failure ends the loop.
5. **Explicit approval before handoff.** Record `recovered-local-collector`
   separately from the original failure, including fresh artifact paths/digests
   and the parent's approval of the exact request/head/review/comment set.
   Only then may the parent continue the same round. Do not increment the
   round count or request another review. A verified zero-comment review with
   no unresolved Copilot threads ends the loop immediately; suppressed comments
   are not actionable input.

Neither subagent may authorize recovery or replace the failed ledger with a
success-only ledger. Recovery does not waive the independent review check,
finding assessment, validation, or publication gate.

## Drain the unresolved backlog

Before requesting the first review, the parent agent owns these steps:

1. Fetch every unresolved review thread on the pull request, including threads
   from reviews that predate this run. Use GraphQL review-thread resolution
   state rather than treating a comment cursor as backlog state.
2. Select Copilot threads using their review association and the exact
   case-insensitive accepted identities `Copilot`,
   `copilot-pull-request-reviewer`, and
   `copilot-pull-request-reviewer[bot]`. GitHub currently represents the review
   author as
   `copilot-pull-request-reviewer[bot]` in REST and
   `copilot-pull-request-reviewer` in GraphQL, while inline comments may use
   `Copilot`. Do not require one login string to match across APIs.
3. Build the complete structured comment list described below. Preserve
   comments whose current `line` or `originalLine` is null; an outdated
   position does not make an unresolved finding disappear.
4. Deliver the backlog to the fix subagent before requesting another review.
   Apply the validation scope and parent publication gate below, just as for
   counted rounds. In standard PR mode, production linter changes require the
   corpus procedure. In promotion PR mode, use promotion validation and never
   run the lintdiff corpus harness.
5. After a valid fix is pushed, reply to each processed thread with the fix
   commit or rationale and resolve it. For an invalid or inapplicable finding,
   reply with the technical rationale and resolve it without changing code.
   Never resolve an `uncertain-or-blocked` finding.
6. Refetch unresolved Copilot threads. Do not start round 1 until this query
   returns zero. If processed threads remain unresolved, stop as a workflow
   failure rather than requesting another review.

If the initial query returns no unresolved Copilot threads, proceed directly to
round 1.

## Review subagent

Give the review subagent the canonical pull request URL and the current round
ledger. It owns these steps:

1. Record the current PR head SHA and latest Copilot review ID and timestamp.
   Also fetch and record the latest Copilot timeline review-request event as the
   pre-request cursor, including its event ID and timestamp or an explicit
   `none`, and fetch whether Copilot is currently present in the pull request's
   requested-reviewers API response.
2. Invoke `/trigger-copilot-review-for-pr` with the canonical pull request URL.
   This requests `@copilot`, which uses **Balanced** mode.
3. Immediately refetch the PR head SHA, latest Copilot timeline review-request
   event, and requested reviewers. Record the post-request event cursor and
   whether Copilot is present in the requested-reviewers API response.
4. Classify the request attempt before polling for a completed review:
   - `new-verified` only when the PR head is unchanged and the post-request
     cursor advances beyond the pre-request cursor to a new Copilot
     review-request event. Record that event against the current PR head.
   - `already-pending-active` only when Copilot was requested before the
     attempt, the post-request API response explicitly confirms Copilot remains
     requested, and the ledger's recorded pending request applies to the
     unchanged current PR head.
   - `failed-or-unverified` for every other outcome, including a trigger that
     reports success without either form of positive API evidence. Return the
     evidence and stop the round. If raw evidence proves a local collector bug,
     only the parent may apply the local collector recovery procedure.

   Do not poll for a completed review, report a successful request, or continue
   the round unless the result is `new-verified` or
   `already-pending-active`.

   Use the bundled [review evidence collector](collector.md) for request
   snapshots, request verification, ordinary polls, final refetches and thread
   mapping. Both agents and the parent reuse its raw-UTC parsing and array
   handling rather than generating inline PowerShell collectors. Each
   invocation writes a new evidence directory; never overwrite failed evidence.
   Run all collector and supporting Python commands with `python -X utf8`
   (prefixed by `mise exec --` when available). Read the collector's structured,
   ASCII-escaped JSON instead of printing raw Unicode review bodies through
   ad-hoc scripts.

5. Poll the paginated REST pull-reviews endpoint,
   `GET /repos/{owner}/{repo}/pulls/{number}/reviews`, at a moderate interval
   rather than repeatedly requesting reviews. Treat its raw response as the
   source of truth for review completion and the numeric review ID. Allow up to
   30 minutes, using monotonic elapsed time only for deadline accounting.
   - Across REST, GraphQL, timeline, and comment surfaces, normalize login
     values case-insensitively and accept exactly `Copilot`,
     `copilot-pull-request-reviewer`, and
     `copilot-pull-request-reviewer[bot]`.
   - A completed review candidate must have a numeric `id`, a `commit_id`
     exactly matching the active request's head, and a raw ISO-8601 UTC
     `submitted_at` at or after the active request timestamp. A submitted
     `COMMENTED` review is complete; do not require `APPROVED`.
   - For every request, record the raw UTC poll time, current PR head, HTTP
     status or error, useful rate-limit metadata, raw response body or a durable
     hash of it, and all parsed Copilot candidates with `id`, login, state,
     `submitted_at`, and `commit_id`. Do not retain only the newest review.
   - Treat a non-2xx response, incomplete or failed pagination, parse failure,
     missing required field, or timestamp-validation failure as a
     collector/polling failure, never as a successful empty result.
   - Compare submission timestamps without changing their timezone. Prefer
     filtering the raw GitHub JSON with `gh api --jq` and comparing normalized
     UTC instants. If PowerShell parses the response with `ConvertFrom-Json`,
     compare its UTC `DateTime` value directly with the request event's
     `UtcDateTime`. Never pass that converted `DateTime` back through
     `[DateTimeOffset]::Parse(...)`: PowerShell can stringify it without the
     `Z`, reinterpret it in the local timezone, and make a new review appear
     older than the request.
     A safe PowerShell comparison for `ConvertFrom-Json` output is:

     ```powershell
     $eventUtc = [DateTimeOffset]::Parse($activeRequestCreatedAt).UtcDateTime
     $submittedUtc = if ($review.submitted_at -is [DateTime]) {
       $review.submitted_at.ToUniversalTime()
     } else {
       [DateTimeOffset]::Parse(
         [string]$review.submitted_at,
         [Globalization.CultureInfo]::InvariantCulture
       ).UtcDateTime
     }
     $isNewReview = $submittedUtc -ge $eventUtc
     ```

   - Immediately before the deadline could be reported, perform a mandatory,
     independent, fully paginated REST pull-reviews refetch. It must discard or
     bypass collector caches and accumulated state and avoid conditional-cache
     headers or behavior where practical. Preserve both the ordinary-poll and
     final-refetch evidence.
   - If the final refetch finds the completed review, classify ordinary polling
     as unreliable and continue with that review; do not call the result a
     Copilot timeout. If the final refetch does not establish a completed
     review, or the refetch itself fails any request, pagination, parsing,
     required-field, or timestamp check, report an indeterminate collector
     failure rather than a Copilot timeout.
     These are operational evidence requirements. Report observed failures
     without asserting which internal cache, pagination, parsing, or state bug
     caused them.
6. Confirm the completed review applies to the round's head SHA. If the PR head
   changed while review was pending, stop the round as stale.
7. Fetch all inline comments from the review-specific numeric REST endpoint,
   `GET /repos/{owner}/{repo}/pulls/{number}/reviews/{numeric_review_id}/comments`,
   with complete pagination. This endpoint is the source of truth for the
   review's comments. Zero comments is a valid completed clean review. Do not
   filter comments by comment-author login or discard one because its current
   line, original line, or diff position is null.
8. Fetch the pull request's GraphQL `reviewThreads` with complete pagination
   only as a secondary mapping and unresolved-state cross-check. Map each REST
   comment database ID and its review ID to its thread, and report unmapped REST
   comments and unresolved threads separately. Missing GraphQL data must never
   override the REST determination that the review completed; if comments need
   thread handling but cannot be mapped, return a mapping collection failure
   without discarding the completed-review evidence or handing off a partial
   list.
9. Cross-check the result against the collector's `review_metadata` summary,
   generated-comment counts, and REST comment count. The summary excludes
   collapsed details; do not inspect suppressed findings as actionable input.
   An absent count marker is not a zero-comment declaration. If the review body
   reports generated comments but the endpoint returns fewer comments, return a
   collection failure instead of `no-new-comments`.
10. Return either:
    - `no-new-comments`, or
    - a structured list containing review ID, review-thread ID, comment ID,
      path, line or original line, diff hunk, comment body, URL, reviewed head
      SHA, and submission time.

The review subagent must not edit files, judge comment validity, or request the
next review on its own.

## Fix subagent

Deliver the complete structured comment list to the same persistent fix
subagent each round. In promotion PR mode, every backlog and round handoff must
also include the absolute target worktree path; instruct the subagent to perform
all file reads, edits, validation, git status checks, staging, commits, and
pushes from that path. Include the pinned lintdiff source ref and commit, exact
source rule and migration-evidence paths, and the verified source-semantics
summary recorded in the ledger. The fix subagent must use that evidence when
distinguishing a promotion adaptation issue from a source semantic issue. It
owns these steps:

1. **Analyze before editing.** Investigate the relevant source, tests, call
   sites, repository conventions, and pull request intent for every comment.
   Keep this investigation scoped to the target rule or feature changed by the
   pull request, its tests and documentation, and direct implementation
   dependencies.
   - Other linter rules are prior-art references, not additional review scope.
     Read them only when needed to identify an existing API or repository
     pattern required by a delivered finding.
   - Prefer exact symbol/API searches and stop after finding a small
     representative set. Do not broadly audit neighboring rules.
   - Never modify, validate, or report unrelated rules unless the delivered
     comment directly identifies a shared dependency whose change is required
     for the target fix.
2. Classify each comment as:
   - `valid-actionable`
   - `invalid-or-not-applicable`
   - `uncertain-or-blocked`
     In promotion PR mode, also classify each non-invalid finding as:
   - `promotion-adaptation-issue`: the promoted copy, native tests,
     documentation, generated official-library references, ruleset
     registration, or change metadata incorrectly adapts the verified immutable
     source
   - `source-semantic-issue`: the finding would require changing the intended
     semantics of the immutable lintdiff source rule or making the promoted copy
     intentionally diverge from it
3. Give a concrete technical rationale for every classification. A Copilot
   suggestion is not evidence by itself.
4. Stop and return the evidence for parent/user guidance if any finding is
   `uncertain-or-blocked`. In promotion PR mode, always classify a verified
   `source-semantic-issue` as `uncertain-or-blocked` for this loop and stop the
   promotion. Report that the source rule must return to lintdiff repair; do not
   edit either the immutable source or the promoted copy.
5. If no finding is `valid-actionable`, make no changes and return
   `no-valid-comments`.
6. Apply all and only the `valid-actionable` findings that are in the pull
   request's scope. In promotion PR mode, every applied finding must also be a
   `promotion-adaptation-issue`. Add or update regression tests where
   appropriate.
7. Select and record the required validation scope below before running
   commands. Run the narrowest existing commands that satisfy that scope and
   repository commit-time requirements.
8. Return the validation evidence and wait for parent publication approval.
   Do not stage, commit, or push as part of the initial fix handoff.

### Validation scope and evidence

For every **standard lintdiff fix**, including tests-only fixes, follow the
targeted formatting and linting procedure in
[`develop-lintdiff-rule`](../develop-lintdiff-rule/SKILL.md). Format explicit
eligible files and lint only changed TypeScript source/test files; do not use
package- or repository-wide lint as a proxy when it has unrelated baseline
warnings. This task-specific exception is independent of the production-source
corpus requirement below. Documentation-only changes do not require source
builds or tests unless the repository defines a documentation-specific check.

For other standard PRs, follow the affected repository/package's existing
targeted validation requirements. Promotion PRs retain the promotion validation
procedure below; do not substitute lintdiff's narrower procedure for it.

Before execution, record each planned command's working directory, exact
command, covered files/behavior, and whether it is required or supplemental,
with the instruction that determines its scope. Record every executed command's
exit code, outcome, and output or durable log path, including failed attempts.
Also record whether corpus validation is required, why, and its results when
applicable.

On a command failure, stop and return the evidence before staging, committing,
or pushing. A passing narrower command does not erase a failed required check.
Do not retrospectively relabel a failed command as supplemental or self-waive
it because its diagnostics appear unrelated. Preserve the failure in the
ledger and report the blocker.

### Linter source changes

In standard PR mode, run the corpus procedure only when a valid fix changes
production linter-rule code. Changes limited to tests, fixtures, snapshots,
documentation, or `migration.md` do not require corpus validation. When
production linter-rule code changes, follow the current linter-source validation
and corpus procedure in `/develop-lintdiff-rule` in full. Treat that skill as
the source of truth for setup, commands, evidence updates, analysis, and
generated-output cleanup. Surface any required validation or corpus failure and
stop the loop.

In promotion PR mode, do not run `/develop-lintdiff-rule`, the lintdiff fixture
harness, or corpus validation. Follow the current targeted validation procedure
in `/lintdiff-rule-promote`, including focused native rule tests, affected
package build and lint, required documentation regeneration and formatting,
rulesets build and test when applicable, affected package tests, and bounded
broader validation when warranted. Treat `/lintdiff-rule-promote` as the source
of truth for the exact current commands and generated-output checks. A
production rule edit is permitted only when it is a verified
`promotion-adaptation-issue` that preserves the immutable source semantics.
Surface any required promotion validation failure and stop the loop.

### Parent publication gate

After all required validation succeeds, return `ready-for-publication` with:

- the local and remote PR head SHA, target worktree, and explicit changed files
- all finding classifications and the complete proposed diff, including new
  files, plus a digest or equivalent content identity for the proposed changes
- the validation scope and complete command/corpus evidence described above

The parent independently inspects the proposed diff and evidence, confirms that
the required scope is satisfied and no command failure or unresolved blocker
remains, and records its decision in the ledger. Only then may it send explicit
publication approval to the same persistent fix subagent, identifying the
approved head SHA and change-content identity. This is an agent-to-agent gate,
not an additional user approval prompt. It applies to backlog fixes and every
counted round, including round five.

### Commit and push

Only after receiving the parent's explicit publication approval:

1. Reconfirm the target worktree diff contains no unrelated or generated corpus
   data. In promotion PR mode, run this and all remaining git commands from the
   ledger's absolute target worktree path. Confirm that the local and remote
   head, proposed content, and validation evidence still match the approval.
   Any change invalidates approval: return to the parent without publishing.
2. Stage only explicit files belonging to the accepted findings. Do not use a
   broad staging command. Confirm staged content matches the approved changes.
3. Create a new commit; do not amend an existing commit.
4. Push the commit to the pull request's remote head branch.
5. Return the pushed commit SHA, changed files, validation evidence, corpus
   evidence when required, and rejection rationale for invalid comments.

After the parent verifies any pushed commit, it replies to every processed
review thread and resolves it as described in **Drain the unresolved backlog**.
The same requirement applies to comments rejected as invalid or inapplicable.

The next Copilot review must not be requested until the push succeeds and the
PR head SHA matches the returned commit.

## Parent orchestration

For rounds 1 through 5:

1. Send the current PR head SHA and ledger to the review subagent.
2. Independently verify the review subagent's result from a fresh, fully
   paginated REST pull-reviews refetch and the numeric review-specific REST
   comments endpoint using the bundled [collector](collector.md). Apply the
   same cache bypass, raw-evidence, identity,
   candidate-validation, and failure rules as the review subagent. REST reviews
   are authoritative for completion and review ID; review-specific REST
   comments are authoritative for comments. Also paginate GraphQL
   `reviewThreads` as a secondary check, map REST comment database IDs and
   review ID, and report unresolved threads separately. GraphQL absence does
   not negate REST completion. A `no-new-comments` result is successful only
   when the review-specific endpoint returns zero comments and no unresolved
   Copilot threads remain. If either check disagrees or any required thread
   mapping is missing, treat it as a collection failure or deliver the fully
   mapped discovered comments to the fix subagent; never report success from
   the subagent result alone.
   If the independently verified result is `no-new-comments`, end the loop
   successfully here. The completed review's suppressed-comment section is
   informational and is not a new-comment queue. Do not continue to the fix
   handoff and do not request a verification review for the unchanged head.
3. Send its new structured comments to the fix subagent.
4. If the fix subagent returns `no-valid-comments`, reply with its rejection
   rationale, resolve the safely rejected threads, verify that no processed
   thread remains unresolved, and then end successfully.
5. If it returns `uncertain-or-blocked` or any command failure, stop and report
   the blocker.
6. For `ready-for-publication`, apply the parent publication gate, then send
   approval to the same fix subagent and await its commit/push result. Stop on
   failed publication or invalidated approval; do not request another review.
7. Verify the approved fix commit is present on the remote PR head.
8. Reply to and resolve every processed thread that was fixed or safely
   rejected, then confirm no processed thread remains unresolved.
9. Record the round in the ledger and hand the pushed SHA plus fix/rejection
   summary back to the review subagent for the next round.

Never run both subagents on the same round concurrently: the fix subagent
depends on the completed review, and the next review depends on the pushed fix.
Do not create replacement subagents between rounds.

## Post-run process review

After the loop reaches a termination condition and the deliverable is complete,
briefly review the run before the final user response. Read and follow the
[shared post-run process review](../shared/post-run-process-review.md), including
its confidence gate, ownership, independent PR, and reporting rules. Focus on:

- review-request or completion checks that were slow, stale, or unreliable, and
  better cursor or polling evidence to use next time
- handoff details that were missing or redundant between the review and fix
  subagents
- comment context or repository evidence that made validity classification
  clearer and reduced unnecessary fixes
- focused validation commands that were too broad, stalled, or failed, together
  with narrower commands that proved sufficient
- corpus setup, linking, filtering, progress reporting, cleanup, or analysis
  steps that could be made faster without weakening regression evidence
- commit and push safeguards that prevented stale reviews, unrelated changes,
  or generated corpus data from entering the pull request
- loop limits, stop conditions, or skill instructions that should be updated
  based on the observed run

## Result

Report:

- the pull request link
- number of completed rounds
- Balanced Copilot reviews requested
- accepted and rejected findings by round
- commits pushed
- focused validation and corpus outcome when applicable
- termination reason: no comments, no valid comments, five-round cap, or blocker
