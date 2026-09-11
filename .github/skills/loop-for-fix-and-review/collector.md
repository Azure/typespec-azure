# Reusable review evidence collector

Use `review_evidence.py` for both the review agent and the parent's independent
refetch. It requires Python 3.12+ and authenticated `gh`, with no third-party
Python packages. Prefer `mise exec -- python` when available. Do not generate
another collector or round-trip GitHub timestamps through PowerShell.

All commands are **read-only**. They do not request a review, approve recovery,
edit files in the PR, publish commits, or resolve threads. Evidence goes into a
caller-supplied **new directory outside the repository**. Reusing an existing
directory fails rather than overwriting an earlier failure.

## Request and collection

From the repository root, set `$collector` to
`.github\skills\loop-for-fix-and-review\review_evidence.py`, `$repo` to the
canonical `owner/repository`, `$pr` to its numeric PR number, and `$evidence` to
an absolute session-artifact directory.

```powershell
mise exec -- python $collector snapshot --repo $repo --pr $pr --output "$evidence\pre"
# Invoke trigger-copilot-review-for-pr exactly once; do not request from this helper.
mise exec -- python $collector snapshot --repo $repo --pr $pr --output "$evidence\post"
mise exec -- python $collector verify-request --repo $repo --pr $pr --before "$evidence\pre\result.json" --after "$evidence\post\result.json" --output "$evidence\request"
```

`verify-request` verifies a new timeline event on the unchanged head, including
the raw UTC event time and numeric cursor. It does not infer an already-pending
request from a missing new event. That exceptional state still needs the
parent's recorded active-request provenance and the skill's explicit
before/after requested-reviewer checks.

Use the verified request's `head` and `request.created_at` as `$head` and
`$requestTime`. Each poll, final refetch and parent refetch must use a distinct
output directory:

```powershell
mise exec -- python $collector collect --repo $repo --pr $pr --head $head --request-time $requestTime --output "$evidence\poll-1"
# After completion, pin the returned review.id for the independent parent refetch:
mise exec -- python $collector collect --repo $repo --pr $pr --head $head --request-time $requestTime --review-id $reviewId --output "$evidence\parent-final"
# Initial backlog and post-resolution checks:
mise exec -- python $collector threads --repo $repo --pr $pr --output "$evidence\threads-1"
```

The caller controls moderate polling intervals and the monotonic 30-minute
deadline. `pending` is not a clean review. Perform the mandatory independent
final refetch before reporting a collection deadline failure. A completed
`COMMENTED` review counts; approval is not required.

The helper collects all REST pages and both levels of GraphQL pagination,
retains nullable comment positions, matches exact Copilot aliases, checks the
head before and after collection, and maps numeric REST comments to their
review/thread association. `threads` returns the full comments and unresolved
Copilot thread IDs; the parent must build and hand off the complete backlog.
The helper recognizes the `Comments generated: N` metadata marker. The caller
must still cross-check other review-body formulations; do not interpret
suppressed comments as a new-comment queue.

Each API request records UTC time, endpoint, exit status, raw HTTP headers/body,
and stderr in `request-NNNN.json`. HTTP headers contain status and rate-limit
metadata. `result.json` includes every parsed Copilot candidate on successful
collection. Raw review responses remain available even if later mapping fails.
API errors, invalid timestamps, missing fields, malformed shapes, incomplete
pagination and stale heads produce `failed` with a nonzero exit, never a
success-shaped empty array. The helper has no automatic retries or recovery
authorization.

## Offline regression coverage

```powershell
mise exec -- python -B -m unittest discover -s .github\skills\loop-for-fix-and-review -p test_review_evidence.py
```

These tests use the standard library and mocked API responses, not live review
requests. They cover timezone-independent comparisons, rejected timezone-less
timestamps, zero/one/many candidates, aliases, missing fields, null positions,
head/request correlation, REST and nested GraphQL pagination, clean-review
cross-checks, and failure evidence preservation. They do not replace the parent
recovery or publication gates.
