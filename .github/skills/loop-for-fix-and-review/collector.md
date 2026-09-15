# Reusable review evidence collector

Use `review_evidence.py` for both the review agent and the parent's independent
refetch. It requires Python 3.12+ and authenticated `gh`, with no third-party
Python packages. Use `mise exec -- python -X utf8` when available, or
`python -X utf8` otherwise, for every collector or supporting Python command.
This avoids Windows legacy encodings when stdout is redirected. Do not generate
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
mise exec -- python -X utf8 $collector snapshot --repo $repo --pr $pr --output "$evidence\pre"
# Invoke trigger-copilot-review-for-pr exactly once; do not request from this helper.
mise exec -- python -X utf8 $collector snapshot --repo $repo --pr $pr --output "$evidence\post"
mise exec -- python -X utf8 $collector verify-request --repo $repo --pr $pr --before "$evidence\pre\result.json" --after "$evidence\post\result.json" --output "$evidence\request"
```

`verify-request` verifies a new timeline event on the unchanged head, including
the raw UTC event time and numeric cursor. It does not infer an already-pending
request from a missing new event. That exceptional state still needs the
parent's recorded active-request provenance and the skill's explicit
before/after requested-reviewer checks.

Use the verified request's `head` and `request.created_at` as `$head` and
`$requestTime`, or pass the verified request artifact directly. Prefer the
bounded `poll` action for review-agent polling; it owns the original 30-minute
deadline, moderate interval, distinct poll directories, and mandatory final
refetch:

```powershell
mise exec -- python -X utf8 $collector poll --repo $repo --pr $pr --request "$evidence\request\result.json" --output "$evidence\polling"
```

For independent parent refetches or recovery checks, use a fresh directory and
pin the completed review ID when one is already known:

```powershell
mise exec -- python -X utf8 $collector collect --repo $repo --pr $pr --head $head --request-time $requestTime --output "$evidence\poll-1"
# After completion, pin the returned review.id for the independent parent refetch:
mise exec -- python -X utf8 $collector collect --repo $repo --pr $pr --head $head --request-time $requestTime --review-id $reviewId --output "$evidence\parent-final"
mise exec -- python -X utf8 $collector collect --repo $repo --pr $pr --request "$evidence\request\result.json" --review-id $reviewId --output "$evidence\parent-final-2"
# Initial backlog and post-resolution checks:
mise exec -- python -X utf8 $collector threads --repo $repo --pr $pr --output "$evidence\threads-1"
```

`poll` records every ordinary poll and anchors the original polling deadline to
the verified request's raw UTC `request.created_at`, including strict
already-pending-active provenance. Passing `--resume-from` preserves the earlier
recorded deadline; omitting it cannot create another 30-minute window for the
same old request. `--deadline-seconds` may shorten the window but is capped at
30 minutes. If the ordinary deadline has expired, `poll` skips ordinary polling
and performs one mandatory independent final refetch using a separately
recorded bounded allowance capped at 60 seconds. Subprocess/API timeouts are
capped by the remaining ordinary deadline during ordinary polls and by the final
refetch allowance for the final read. `pending` is reported as a failure unless
that independent final refetch establishes a completed review. A completed
`COMMENTED` review counts; approval is not required. Already-pending-active
request artifacts are accepted only when they include strict active-request
provenance for the same head, request event and before/after requested-reviewer
state. Failed collector or terminal attempts still require the skill's parent
recovery gate; CLI flags do not authorize recovery or a new review request.

The helper collects all REST pages and both levels of GraphQL pagination,
retains nullable comment positions, matches exact Copilot aliases, checks the
head before and after collection, and maps numeric REST comments to their
review/thread association. `threads` returns the full comments and unresolved
Copilot thread IDs; the parent must build and hand off the complete backlog.
Completed collections include `review_metadata`:

- `summary`: review-body text before the first `<details>` section, preserving
  Unicode but excluding collapsed details from this display.
- `generated_comment_counts`: all recognized `Comments generated: N` values
  from the body, including markers in collapsed metadata. An empty array means
  no recognized marker, not a declaration of zero comments.
- `rest_comment_count`: the number of comments from the numeric review endpoint.

The helper rejects any recognized generated count greater than the REST count.
The caller must still cross-check other declarations in `summary`. Use these
structured fields rather than ad-hoc scripts that print raw review bodies.
Suppressed details remain in raw evidence, not the summary or a new-comment
queue; do not inspect them after an independently verified clean review.

Result files and stdout use lossless ASCII-escaped JSON, so Unicode review text
also survives legacy redirected stdout. Decode JSON to recover the original
text; do not strip or replace unsupported characters. A display-only failure
does not invalidate already-saved evidence, but it does not authorize resuming
the loop either. Preserve the error and use the parent eligibility gate in
[local collector recovery](SKILL.md#local-collector-recovery).

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
mise exec -- python -X utf8 -B -m unittest discover -s .github\skills\loop-for-fix-and-review -p test_review_evidence.py
```

These tests use the standard library and mocked API responses, not live review
requests. They cover timezone-independent comparisons, rejected timezone-less
timestamps, raw UTC request artifacts, corrupt/wrong artifacts, zero/one/many
candidates, aliases, missing fields, null positions, head/request correlation,
REST and nested GraphQL pagination, clean-review cross-checks, deadline and
final-refetch polling behavior, no-reset behavior without `--resume-from`,
already-pending deadline anchoring, failed/pending recovery evidence, distinct
evidence directories, subprocess timeout bounds, lossless partial timeout
stdout/stderr evidence, structured metadata, and lossless Unicode output through
strict cp1252 stdout. They do not replace the parent recovery or publication
gates.
