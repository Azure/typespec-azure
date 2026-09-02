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
  only valid findings, validates the changes, commits them, and pushes them to
  the pull request.

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
- Stop immediately on an unverified review request, review timeout, validation
  failure, corpus failure, push failure, or finding whose validity cannot be
  determined safely. Report the blocker instead of silently continuing.

## Initialize

1. Resolve the pull request to its canonical URL, repository, number, base
   branch, head branch, head repository owner, and current head SHA:

   ```bash
   gh pr view "$PR" --json url,number,state,isDraft,baseRefName,headRefName,headRepositoryOwner,headRefOid
   ```

2. Confirm the pull request is open.
3. Confirm the current worktree is the pull request's head branch and has no
   unrelated changes. Do not overwrite, discard, or include unrelated work.
   In promotion PR mode, require an existing local promotion worktree already
   checked out at the pull request's head branch and head SHA, with a completely
   clean index and working tree. The loop must use that worktree. If no such
   worktree exists or it has any local changes, stop immediately and report the
   path and changed files when available. Do not clean, stash, overwrite, or
   include those changes. Do not create a worktree, check out the promotion
   branch in another worktree, invoke `/lintdiff-rule-promote` to reconstruct
   one, or otherwise prepare promotion state as part of this loop. If the clean
   worktree exists but the current session is not rooted in it, stop and report
   its path so the user can open the loop there.
4. In promotion PR mode, resolve and record the immutable lintdiff source rule,
   source branch or ref, source commit, and migration evidence identified by the
   promotion PR. If this provenance is missing or cannot be verified, stop as a
   blocker rather than guessing the source behavior.
5. Create the two persistent subagents once. Pin the fix subagent to
   `gpt-5.6-sol`; do not allow automatic model selection or substitution for
   that role. The review subagent does not require this model pin. Reuse the
   same agents in every round so each retains its prior context.
6. Maintain a round ledger containing:
   - pull request mode: `standard` or `promotion`
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
   - Copilot review ID and submission timestamp
   - comment IDs delivered to the fix subagent
   - validity decision for each comment
   - promotion finding category when applicable
   - validation procedure and corpus results when applicable
   - pushed fix commit SHA
   - processed review-thread IDs and their final resolution state

## Drain the unresolved backlog

Before requesting the first review, the parent agent owns these steps:

1. Fetch every unresolved review thread on the pull request, including threads
   from reviews that predate this run. Use GraphQL review-thread resolution
   state rather than treating a comment cursor as backlog state.
2. Select Copilot threads using their review association and accepted identity
   variants. GitHub currently represents the review author as
   `copilot-pull-request-reviewer[bot]` in REST and
   `copilot-pull-request-reviewer` in GraphQL, while inline comments may use
   `Copilot`. Do not require one login string to match across APIs.
3. Build the complete structured comment list described below. Preserve
   comments whose current `line` or `originalLine` is null; an outdated
   position does not make an unresolved finding disappear.
4. Deliver the backlog to the fix subagent before requesting another review.
   In standard PR mode, if it changes production linter behavior, run the
   required corpus procedure. In promotion PR mode, use the promotion validation
   procedure below and never run the lintdiff corpus harness.
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
     evidence and stop the round.

   Do not poll for a completed review, report a successful request, or continue
   the round unless the result is `new-verified` or
   `already-pending-active`.

5. Wait for a new review submitted by
   `copilot-pull-request-reviewer[bot]` after the active request event. Poll
   GitHub at a moderate interval rather than repeatedly requesting reviews.
   Allow up to 30 minutes.
6. Confirm the completed review applies to the round's head SHA. If the PR head
   changed while review was pending, stop the round as stale.
7. Fetch all inline comments belonging to the new review by its numeric review
   ID, using `GET /repos/{owner}/{repo}/pulls/{number}/reviews/{review_id}/comments`
   with pagination or by filtering all PR review comments on
   `pull_request_review_id == review_id`. Do not filter these comments by
   comment-author login. Do not discard a comment because its current line,
   original line, or diff position is null.
8. Fetch the pull request's GraphQL review threads with pagination and map every
   collected REST review comment ID to the GraphQL thread whose comments include
   that `databaseId`. If any REST comment cannot be mapped to a review-thread ID,
   return a collection failure and do not hand off a partial list.
9. Cross-check the result against available review metadata. If the review body
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
also include the pinned lintdiff source ref and commit, exact source rule and
migration-evidence paths, and the verified source-semantics summary recorded in
the ledger. The fix subagent must use that evidence when distinguishing a
promotion adaptation issue from a source semantic issue. It owns these steps:

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
7. Run the narrowest existing tests, build, and lint commands that cover the
   changed behavior. Follow all repository commit-time formatting and linting
   requirements before committing.

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

### Commit and push

After all required validation succeeds:

1. Reconfirm the worktree diff contains no unrelated or generated corpus data.
2. Stage only explicit files belonging to the accepted findings. Do not use a
   broad staging command.
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
2. Independently verify the review subagent's result using the numeric
   review-specific comments endpoint. Also refetch unresolved Copilot review
   threads and verify that every collected REST comment is mapped to its GraphQL
   review-thread ID before handoff. A `no-new-comments` result is successful only
   when the endpoint returns zero comments and no unresolved Copilot threads
   remain. If either check disagrees or any thread mapping is missing, treat it
   as a collection failure or deliver the fully mapped discovered comments to
   the fix subagent; never report success from the subagent result alone.
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
6. Verify the fix commit is present on the remote PR head.
7. Reply to and resolve every processed thread that was fixed or safely
   rejected, then confirm no processed thread remains unresolved.
8. Record the round in the ledger and hand the pushed SHA plus fix/rejection
   summary back to the review subagent for the next round.

Never run both subagents on the same round concurrently: the fix subagent
depends on the completed review, and the next review depends on the pushed fix.
Do not create replacement subagents between rounds.

## Post-run process review

After the loop reaches a termination condition and the deliverable is complete,
briefly review the run before the final user response. Capture concrete
suggestions for the next review-and-fix loop, especially:

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

Print the consolidated suggestions in the final handoff and ask the user
whether any should be adopted into this skill. Do not update the skill
automatically from the post-run review; only make skill changes after the user
explicitly approves the specific suggestion(s).

Apply approved skill improvements once, after the loop has ended. Keep that
change separate from target-rule fixes: use a dedicated commit and do not add it
to the target pull request unless the user explicitly requests that placement.
Do not restart the completed review loop merely to review the skill update.

## Result

Report:

- the pull request link
- number of completed rounds
- Balanced Copilot reviews requested
- accepted and rejected findings by round
- commits pushed
- focused validation and corpus outcome when applicable
- termination reason: no comments, no valid comments, five-round cap, or blocker
