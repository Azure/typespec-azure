---
name: loop-for-fix-and-review
description: Iterate on a pull request with two persistent subagents: one requests and collects GitHub Copilot reviews in Balanced mode, and one independently evaluates and fixes valid review findings. Use when the user wants a bounded Copilot review-and-fix loop until no new valid comments remain.
argument-hint: "<pull request URL or number>"
user-invocable: true
---

# Loop for Copilot review and fixes

Run a bounded review-and-fix loop for an existing pull request. Use exactly two
persistent subagents with separate responsibilities:

- **Review subagent:** requests Copilot reviews and collects only comments from
  the newly completed review.
- **Fix subagent:** analyzes every new comment, adopts only valid findings,
  validates the changes, commits them, and pushes them to the pull request.

The parent agent orchestrates handoffs and tracks loop state. It must not treat
Copilot comments as automatically correct.

## Required input

Accept either:

- a full GitHub pull request URL
- a pull request number when the current repository is the target repository

If neither is available, ask the user for the pull request URL or number.

## Loop limits

- Run at most **five review/fix rounds**.
- A round starts when a Copilot review is requested.
- Stop earlier when the new review has no comments or when the fix subagent
  finds no valid actionable comments.
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
   gh pr view <pr> --json url,number,state,isDraft,baseRefName,headRefName,headRepositoryOwner,headRefOid
   ```

2. Confirm the pull request is open.
3. Confirm the current worktree is the pull request's head branch and has no
   unrelated changes. Do not overwrite, discard, or include unrelated work.
4. Create the two persistent subagents once. Pin the fix subagent to
   `gpt-5.6-sol`; do not allow automatic model selection or substitution for
   that role. The review subagent does not require this model pin. Reuse the
   same agents in every round so each retains its prior context.
5. Maintain a round ledger containing:
   - round number
   - head SHA reviewed
   - review-request event timestamp
   - Copilot review ID and submission timestamp
   - comment IDs delivered to the fix subagent
   - validity decision for each comment
   - validation and corpus results
   - pushed fix commit SHA

## Review subagent

Give the review subagent the canonical pull request URL and the current round
ledger. It owns these steps:

1. Record the current PR head SHA, latest Copilot review ID and timestamp, and
   existing Copilot review-comment IDs. These form the round cursor.
2. Invoke `/trigger-copilot-review-for-pr` with the canonical pull request URL.
   This requests `@copilot`, which uses **Balanced** mode, and verifies the new
   timeline request event.
3. Wait for a new review submitted by
   `copilot-pull-request-reviewer[bot]` after that request event. Poll GitHub at
   a moderate interval rather than repeatedly requesting reviews. Allow up to
   30 minutes.
4. Confirm the completed review applies to the round's head SHA. If the PR head
   changed while review was pending, stop the round as stale.
5. Fetch inline review comments belonging to that new Copilot review. Exclude
   all comment IDs at or before the round cursor. Do not redeliver comments from
   earlier reviews.
6. Return either:
   - `no-new-comments`, or
   - a structured list containing review ID, comment ID, path, line or original
     line, diff hunk, comment body, URL, reviewed head SHA, and submission time.

The review subagent must not edit files, judge comment validity, or request the
next review on its own.

## Fix subagent

Deliver the complete structured comment list to the same persistent fix
subagent each round. It owns these steps:

1. **Analyze before editing.** Investigate the relevant source, tests, call
   sites, repository conventions, and pull request intent for every comment.
2. Classify each comment as:
   - `valid-actionable`
   - `invalid-or-not-applicable`
   - `uncertain-or-blocked`
3. Give a concrete technical rationale for every classification. A Copilot
   suggestion is not evidence by itself.
4. Stop and return the evidence for parent/user guidance if any finding is
   `uncertain-or-blocked`.
5. If no finding is `valid-actionable`, make no changes and return
   `no-valid-comments`.
6. Apply all and only the `valid-actionable` findings that are in the pull
   request's scope. Add or update regression tests where appropriate.
7. Run the narrowest existing tests, build, and lint commands that cover the
   changed behavior. Follow all repository commit-time formatting and linting
   requirements before committing.

### Linter source changes

If a valid fix changes production linter source code or linter behavior, follow
the corpus procedure in `/develop-lintdiff-rule`, especially **Run focused
validation**, **Run the existing corpus analysis**, **Refresh the rule migration
note**, and **Exclude generated corpus data from the PR**.

For `packages/typespec-lintdiff`, this includes:

1. Run focused fixture tests, package build, and package lint first.
2. Verify the isolated `azure-rest-api-specs` worktree and local linter link,
   preparing them as documented by `/develop-lintdiff-rule` when needed.
3. Run a representative filtered corpus before the full corpus.
4. Run the existing full corpus runner when practical:

   ```powershell
   pnpm --dir packages/typespec-lintdiff specs:typespec -- `
     --specs-repo <isolated-azure-rest-api-specs-worktree> `
     --concurrency 6
   ```

5. Analyze overlap, one-sided projects, version attribution, and compile
   failures rather than relying only on command success.
6. Refresh the affected rule's `migration.md` with the new corpus evidence.
7. Restore generated changes under `packages/typespec-lintdiff/specs`; corpus
   output is validation evidence and must not be committed.
8. Confirm the final diff contains only intended source, test, fixture,
   snapshot, documentation, migration-note, or existing change-description
   updates.

Do not skip corpus validation merely because the review fix is small. Surface a
corpus failure and stop the loop.

### Commit and push

After all required validation succeeds:

1. Reconfirm the worktree diff contains no unrelated or generated corpus data.
2. Stage only explicit files belonging to the accepted findings. Do not use a
   broad staging command.
3. Create a new commit; do not amend an existing commit.
4. Push the commit to the pull request's remote head branch.
5. Return the pushed commit SHA, changed files, validation evidence, corpus
   evidence when required, and rejection rationale for invalid comments.

The next Copilot review must not be requested until the push succeeds and the
PR head SHA matches the returned commit.

## Parent orchestration

For rounds 1 through 5:

1. Send the current PR head SHA and ledger to the review subagent.
2. If it returns `no-new-comments`, end successfully.
3. Send its new structured comments to the fix subagent.
4. If the fix subagent returns `no-valid-comments`, end successfully and report
   why the comments were rejected.
5. If it returns `uncertain-or-blocked` or any command failure, stop and report
   the blocker.
6. Verify the fix commit is present on the remote PR head.
7. Record the round in the ledger and hand the pushed SHA plus fix/rejection
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

Print the suggestions in the final handoff and ask the user whether any should
be adopted into this skill. Do not update the skill automatically from the
post-run review; only make skill changes after the user explicitly approves the
specific suggestion(s).

## Result

Report:

- the pull request link
- number of completed rounds
- Balanced Copilot reviews requested
- accepted and rejected findings by round
- commits pushed
- focused validation and corpus outcome when applicable
- termination reason: no comments, no valid comments, five-round cap, or blocker
