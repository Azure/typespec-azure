---
name: trigger-copilot-review-for-pr
description: Request a GitHub Copilot review for an existing pull request with GitHub CLI in Balanced mode, then verify the request from the PR timeline. Use when the user asks to trigger, request, or rerun a Copilot review on a PR.
argument-hint: "<pull request URL or number>"
user-invocable: true
---

# Trigger Copilot review for a pull request

Use GitHub CLI to request a Copilot code review in **Balanced** mode for an
existing pull request.

## Required input

Accept either:

- a full GitHub pull request URL
- a pull request number when the current repository is the target repository

If neither is available, ask the user for the pull request URL or number.

## Process

1. Confirm GitHub CLI authentication:

   ```bash
   gh auth status
   ```

2. Confirm that the pull request exists and is open:

   ```bash
   gh pr view <pr> --json number,state,isDraft,url
   ```

   Draft pull requests are supported. Stop and report the state if the pull
   request is not open.

3. Request Copilot as a reviewer:

   ```bash
   gh pr edit <pr> --add-reviewer '@copilot'
   ```

   `@copilot` uses GitHub Copilot code review's default **Balanced** mode. Do
   not invent a mode-qualified reviewer such as `@copilot/balanced`.

4. Verify that GitHub recorded a new `review_requested` event for the
   `Copilot` reviewer. Derive the owner, repository, and pull request number
   from the canonical URL returned by `gh pr view`, then query:

   ```bash
   gh api repos/<owner>/<repo>/issues/<number>/events --paginate \
     --jq '[.[] | select(.event == "review_requested" and .requested_reviewer.login == "Copilot") | {actor: .actor.login, created_at, reviewer: .requested_reviewer.login}] | last'
   ```

   Compare the event timestamp with the current request so that an older
   Copilot request is not mistaken for the new one.

## Verification notes

- A successful Copilot request may not remain in the pull request's
  `requested_reviewers` array because GitHub dispatches it immediately. An
  empty array is not evidence that the request failed.
- The timeline `review_requested` event is the source of truth for dispatch.
- A completed review later appears under the
  `copilot-pull-request-reviewer[bot]` account, but do not wait for completion
  unless the user explicitly asks.
- If `gh pr edit` fails, report the CLI error directly. Do not claim that the
  review was requested.
- If the command succeeds but no new timeline event appears, report that the
  request could not be verified rather than claiming success.

## Result

State whether GitHub accepted and verified the Copilot review request, include
the pull request link, and explicitly identify the mode as **Balanced**.
