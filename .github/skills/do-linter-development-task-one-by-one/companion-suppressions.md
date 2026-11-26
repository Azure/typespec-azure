# Companion suppression PRs

This queue-owned workflow publishes a proposed consumer compatibility change,
not a green-CI or merge outcome. It applies to the actual linter PR whose
changed implementation is exercised by external specs CI: the native PR, or
the applicable legacy promotion PR. Do not manufacture a companion for a
temporary lintdiff-only PR that the external suite does not consume.

## Initial delivery by default

Before handing off the initial linter deliverable, inspect its existing,
completed external specs CI evidence. Support both public
`Azure/azure-rest-api-specs:typespec-next` and private
`Azure/azure-rest-api-specs-pr:typespec-next` as independent consumer targets;
the private path supplements, not replaces, the public path. If source analysis
confirms PR-caused compatibility diagnostics, create that consumer's companion
without another proposal opt-in. Link public companions directly in the linter
PR description; apply the private disclosure boundary below to private ones.
Do not wait for a user to request this first proposal. An authorized request for
private validation permits the selected PR's latest code to execute against
private specs, without a separate exact-revision approval question.

Reconcile each consumer's recorded companion binding and permitted links before creation.
An existing companion is not another initial creation: retain it and report
whether its pinned evidence is current or stale. Only explicit refresh can
replace its source history; ordinary resumption must not duplicate it.

No confirmed applicable diagnostics means no empty suppression PR. Missing,
pending or stale CI evidence is not proof that no suppressions are needed:
record that disposition and the missing evidence, without guessing annotations
or launching local validation. Public evidence remains existing-CI-only.
The authorized private diagnostic dispatch below is the sole CI-request exception;
it does not authorize public dispatches or suppression-validation CI.

The coordinator owns the companion binding and publication. Keep the linter
owner/review agents idle during companion writes, verify quiescence, and use
the existing publication backend and physical `worktrees_folder` boundary.
A conditional consumer checkout is separate from the frozen specs runtime;
never reset or edit the baseline runtime to prepare the proposal.
Preflight the consumer publication role before edits: the selected tool must
explicitly target its repository/head/base or use a correctly bound consumer
app owner. Changing cwd is not app ownership; unsupported controls remain a
blocker, not permission to bypass the required publication tool.

## Private diagnostic CI dispatch

Follow the
[maintainer procedure](https://github.com/Azure/typespec-azure/issues/6108#issuecomment-7183951654)
for the experimental private path. This is diagnostic acquisition for the
actual native or legacy promotion PR, not validation of suppression edits.
Do not dispatch it for a temporary lintdiff-only PR.

1. Verify private-repository access, the dispatcher's write permission, the
   current workflow and inputs on `experiment/typespec-azure-pr-validation`,
   and the selected public linter PR identity. Read current
   workflow instructions rather than assuming the experiment still exists.
   Record unavailable access/workflow capability as a private-target blocker;
   never fall back to a public workflow or upload private source elsewhere.
2. Record the request authorizing private validation of this PR. It authorizes
   execution of the selected PR's latest code with private-spec access; do not
   pause to request a separate SHA approval or supply the removed approved-SHA
   input. Dispatch only a trusted PR within the request's scope. Actual access
   or organizational trust-policy restrictions remain blockers; a matching SHA
   or read-only token is not proof of trust. Merely editing this skill does not
   authorize a validation run.
3. Reconcile recorded and existing runs before issuing one dispatch for the
   authorized PR. Reuse compatible evidence rather than duplicating a run.
   The PR URL is the only required PR-mode input:

   ```powershell
   gh workflow run typespec-validation-all.yaml --repo Azure/azure-rest-api-specs-pr --ref experiment/typespec-azure-pr-validation -f "typespec-azure-pr-url=$linterPrUrl"
   ```

   Bind the resulting run to its actual workflow ref, inputs, actor and
   dispatch time; do not assume the latest run belongs to this task. Persist
   the dispatch attempt before execution. An uncertain dispatch is reconciled
   read-only, never blindly retried or duplicated.
   The workflow resolves and pins the PR head when preparation starts. A SHA
   fetched before dispatch is informational, not the authoritative tested
   revision. If the PR advances, keep the run's pinned identity and disclose
   any stale-head limitation; do not silently relabel evidence or auto-redispatch.

4. Track only that run to completion within the recorded queue deadlines.
   Reuse existing completion notifications or bounded status checks, not an
   unbounded polling loop. Preserve failed, cancelled, pending or timed-out
   dispositions; do not automatically rerun jobs. No worktree owner or command
   may remain active when advancing the queue.
5. Retrieve its private `typespec-pr-evidence-*` artifacts before the documented
   14-day expiry. Verify provenance and actual candidate package installation/
   content checks, and retain every available Ubuntu/Windows shard's diagnostics
   (three shards per OS). Missing evidence is an explicit assessment limitation,
   not a zero-diagnostic result. Record the workflow-resolved PR head separately from
   pinned public main, the temporary merged build SHA and pinned private
   `typespec-next` SHA. The experiment branch supplies the workflow, not specs.
   Never merge `RPSaaSMaster`, move the linter branch or reproduce the candidate
   build locally as part of this proposal.
6. Apply the causality analysis below. A red run or matching rule ID alone
   does not establish a PR-caused diagnostic. A build/install failure without
   usable diagnostic evidence is a blocker, not justification for annotations.
   Attribute the PR's changes relative to the pinned public main used in the
   candidate build, not only its older branch base; exclude diagnostics from
   unrelated main changes or private ruleset configuration. Unresolved attribution
   stays excluded without dispatching additional baseline runs.
   Repeated OS, shard, API-version and entrypoint occurrences must retain their
   provenance while mapping to unique authored targets.

The workflow builds the selected PR's latest code with access to private specs.
Verify the actual trust boundary and retain the authorizing request and tested
revision. There is no separate per-SHA approval gate.
This procedure authorizes no dispatch in a skill-editing task itself.

### Private evidence and disclosure

Keep private logs, artifacts, source excerpts, service/project names, diagnostic
counts, attribution reports and consumer branch/PR identities in private storage
and `Azure/azure-rest-api-specs-pr` only. Any local checkout, downloaded artifacts
and private handoff/log files must use verified private-access storage within
the selected `worktrees_folder`, separate from public/frozen worktrees.
Do not put private payloads in the public linter worktree's `log.txt`, public
evidence branches, `migration.md`, PR descriptions, comments or skill examples.
Public logs/reports may contain only a generic private-proposal disposition.
Preflight report publication visibility before uploading anything; if the
available evidence backend is public-only, retain the private report privately
and report that publication limitation rather than weakening the boundary.

The private companion links the public linter PR and its private causality
report. The public linter PR and report must not link back to the private
companion or expose its number/URL. Use only a generic private-proposal status
under the shared PR description contract. Private proposals remain
inspection-only: do not run local consumer validation, request CI for the
suppression edits, or claim those edits passed validation. Normal PR-triggered
CI may run independently; waiting for, rerunning or repairing it is out of scope.

## Causality before edits or PR creation

1. Retain the failed run/job URL, linter head, tested specs commit and original
   log identity. Read the actual suite configuration and warning-promotion flags.
   Do not assume the current `typespec-next` tip was the tested source.
2. Compare the linter's pre-change implementation with the failed head. Trace
   each included diagnostic to a changed reporting path and its actual source
   target and effective configuration. The same rule code alone does not prove
   causality; distinguish unchanged checks and messages within an existing rule.
3. Classify findings as confirmed PR-caused compatibility diagnostics,
   unrelated/pre-existing, native false positives, stale after source drift,
   or unresolved. Suppress only the first category. Native bugs belong in a
   separate source-defect handoff, not in compatibility suppressions.
4. Preserve raw occurrences and entrypoint/project provenance. Deduplicate by
   actual source target, rule and message before counting authored edits.
   Publish readable and machine-readable attribution, with exclusions and
   unresolved findings; raw diagnostic lines are not unique suppressions.
5. Reconcile reported locations against the fetched consumer source without
   compiling it. Exclude unresolved targets instead of extrapolating new
   warnings. Use explicit UTF-8 for report/helper text I/O and the existing
   evidence sanitization/publication contract.

## Suppression-only proposal

Fetch the selected canonical consumer's `typespec-next`: public
`Azure/azure-rest-api-specs` or private `Azure/azure-rest-api-specs-pr`.
Create a new dedicated source branch **from that fetched commit in that same
Azure-owned repository**, and target its `typespec-next` branch. Never transfer
private edits into the public consumer. Verify actual remote URLs,
push permission, branch restrictions and head/base metadata; no personal fork
fallback or direct push to `typespec-next` is authorized.

Add only rule-specific `#suppress` annotations with contract-preservation reasons
at confirmed diagnostic targets. For latest-API-only guidance, annotate the
diagnosed latest version member, not every historical member or the namespace;
use an unversioned namespace only when that is the actual diagnostic target.
Preserve existing baseline annotations and avoid duplicate additions for shared
declarations or repeated entrypoints.

Use a backward-compatibility justification, not a promise of a future upgrade.
For example:

```tsp
#suppress "@azure-tools/typespec-azure-resource-manager/arm-common-types-version" "Preserve the existing v5 common-types contract for backward compatibility."
```

Keep the actual selected version in the reason (for example v3, v4 or v5).
Do not use "pending a separately reviewed upgrade."

Read the complete diff and map every edit to the report. Do not change API
contracts, common-types selections, dependencies, lockfiles, generated Swagger
or CI settings. Do not run local compilation, builds, tests, lint, formatting,
integration, emission or dependency setup for this companion. This exception is
for consumer suppressions, not the linter's normal native validation or the
lightweight checks on an independently requested skill update.

Publish one suppression-only draft PR after the causality analysis. Its
description links the linter PR and report, records source identities and edit
counts, and says local validation was intentionally not run. For a public
companion, add its verified URL in a peer `## Companion suppression PR` section
after Migration report using the
[description contract](../shared/migration-pr-description.md), preserving the
original headings, source links and report URL. Link back in the companion's
description and update report NOTES, subject to the private disclosure boundary.
For a private companion, publish its URL/report only in private handoffs and use
the generic public disposition instead. Verify actual pushed heads, file scope,
descriptions and links; do not treat source/diff inspection as compilation proof.

Stop when the analyzed proposal and links are published. Do not coordinate
landing, merge, request/rerun/wait for suppression CI, or require checkpoint B
to complete this proposal. The private diagnostic acquisition above is a
separate earlier step, not permission to validate the suppression edits.
Ordinary CI triggered by publication may run independently; do not claim it
passed. A complete companion does not waive an existing failed gate or
establish success of the full native/legacy linter task.

An explicitly requested heading or justification-only correction is not a
diagnostic refresh. Keep the existing targets, PR and source branch, publish a
normal incremental commit for reason changes, and update descriptions/report
metadata as needed. Do not rebuild from `typespec-next`, regenerate diagnostics
or force-push for a presentation-only correction.

## Explicit refresh only

Recognize `--refresh-suppression-pr <linter-pr-url>` before rule/flow parsing.
Accept one canonical Azure/typespec-azure PR URL and the optional
`--worktrees-folder <absolute-path>` only. Reject duplicate/missing values,
rule IDs, worker commands, `--flow`, `--task-file` and other options before setup.
Apply the normal [folder validation](SKILL.md#required-input), including the
default `C:\dev\worktrees`; refresh does not relax physical containment.
An explicit natural-language refresh request with the same unambiguous PR
binding can select this mode too; an ordinary resumption or linter edit cannot.
Do not invoke the catalog validator, native preparation, source development,
coverage, promotion or review loops for this standalone proposal refresh.

```text
/do-linter-development-task-one-by-one --refresh-suppression-pr https://github.com/Azure/typespec-azure/pull/6035
```

Resolve the existing companion from its per-consumer recorded binding and
permitted description links/private handoff. Require one open task-owned PR with
head and base in the same selected consumer repository and base `typespec-next`.
If both public and private companions exist, require an explicit consumer
repository in the natural-language refresh request; a bare linter-URL command
is ambiguous and blocks mutation. Do not add flags to the strict grammar above.
Disagreement, multiple candidates within that consumer or a closed/merged PR
blocks mutation. Preserve the same PR number and source branch name. Do not
silently create a replacement, retarget or close the old PR.

1. Confirm all old owners/commands are stopped and the owned source worktree is
   clean at the recorded remote head. Retain the old head/base, patch, report
   and failed attempts outside tracked consumer source. Unrelated or unpublished
   changes must not be discarded.
2. Capture the remote suppression head SHA once, fetch current `typespec-next`,
   and redo the causality/report analysis against the current linter and
   compatible CI evidence. Private evidence acquisition, if needed, follows
   the authorized latest-head dispatch rules above; public refresh uses existing
   evidence only. Do not reuse the old suppression patch.
   If no annotations remain justified, report that the companion is no longer
   needed; do not invent an empty commit or automatically close/replace the PR
   or claim it was refreshed.
3. Recreate the existing source branch from the freshly fetched
   `typespec-next` commit, then add only currently justified suppressions.
   Preserve annotations already in the base, but carry over none of the old
   PR's commits or obsolete additions. Read the full base-to-head diff and
   create a normal new commit; do not amend or cherry-pick the old patch.
4. This explicit refresh authorizes a force-with-lease update **only to that
   verified suppression PR's source ref**. Confirm it is not the consumer
   base/default branch, the linter branch or another protected/unrelated ref;
   never bypass a branch restriction. Pin the lease to the captured old SHA:

   ```text
   git push --force-with-lease=refs/heads/<suppression-branch>:<captured-old-sha> <verified-remote> HEAD:refs/heads/<suppression-branch>
   ```

   This is the sole history-recreation exception; native/development/promotion
   and evidence branch protections remain unchanged. A rejected lease or
   indeterminate push is a stop, not permission to reread the head and retry.

5. Verify the same PR now has the rebuilt head and no obsolete PR-added
   suppressions, refresh its description/report and the linter's existing link,
   and return the new identities within their permitted visibility. No local
   validation, suppression CI or merge work is added.

If a linter edit makes a previously published companion stale, record that
fact and its pinned source identity. Do not automatically refresh during a
review loop or claim an old proposal matches the new head.

## Ledger and handoff

Key companion records by task/linter PR and consumer repository, not by the
linter URL alone. Record each target independently so one public proposal
cannot suppress or overwrite private acquisition/publication state.
Record initial/default versus explicit-refresh mode, task/linter PR and head,
CI/specs provenance, causality/exclusions, raw and unique counts, report identity,
consumer base, companion PR/repository/source branch and head, description links,
old/new identities and captured lease for refresh, publication attempts and
proposal status (`published`, `not-needed`, `pending-evidence` or `blocked`).
For private dispatch, also retain the authorizing request, attempt/run
identity, workflow ref, actual candidate/specs/package identities, shard/artifact
availability and private report location. Keep these records within the private
disclosure boundary; shared public ledgers contain generic dispositions only.
Carry existing task counters; refresh does not reset them or create a semantic
repair cycle. Report proposal status separately from full linter readiness.
