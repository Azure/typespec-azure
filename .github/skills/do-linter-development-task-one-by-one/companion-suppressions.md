# Companion suppression PRs

This queue-owned workflow publishes a proposed consumer compatibility change,
not a green-CI or merge outcome. It applies to the actual linter PR whose
changed implementation is exercised by external specs CI: the native PR, or
the applicable legacy promotion PR. Do not manufacture a companion for a
temporary lintdiff-only PR that the external suite does not consume.

## Initial delivery by default

Before handing off the initial linter deliverable, inspect its existing,
completed external specs CI evidence. If source analysis confirms PR-caused
compatibility diagnostics, create the companion without another opt-in and
link it directly in the linter PR description. Do not wait for a user to request
this first proposal.

Reconcile the recorded companion binding and description link before creation.
An existing companion is not another initial creation: retain it and report
whether its pinned evidence is current or stale. Only explicit refresh can
replace its source history; ordinary resumption must not duplicate it.

No confirmed applicable diagnostics means no empty suppression PR. Missing,
pending or stale CI evidence is not proof that no suppressions are needed:
record that disposition and the missing evidence, without guessing annotations,
launching local validation, requesting a CI run or starting a polling loop.

The coordinator owns the companion binding and publication. Keep the linter
owner/review agents idle during companion writes, verify quiescence, and use
the existing publication backend and physical `worktrees_folder` boundary.
A conditional consumer checkout is separate from the frozen specs runtime;
never reset or edit the baseline runtime to prepare the proposal.
Preflight the consumer publication role before edits: the selected tool must
explicitly target its repository/head/base or use a correctly bound consumer
app owner. Changing cwd is not app ownership; unsupported controls remain a
blocker, not permission to bypass the required publication tool.

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

Fetch canonical Azure/azure-rest-api-specs:`typespec-next`. Create a new dedicated
source branch **from that fetched commit in Azure/azure-rest-api-specs**, and
target the same repository's `typespec-next` branch. Verify actual remote URLs,
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
counts, and says local validation was intentionally not run. Add its verified
URL in a peer `## Companion suppression PR` section after Migration report using the
[description contract](../shared/migration-pr-description.md), preserving the
original headings, source links and report URL. Link back in the companion's
description and update report NOTES. Verify actual pushed heads, file scope,
descriptions and links; do not treat source/diff inspection as compilation proof.

Stop when the analyzed proposal and links are published. Do not coordinate
landing, merge, request/rerun/wait for CI, or require checkpoint B to complete
this proposal. Ordinary CI triggered by publication may run independently;
do not claim it passed. A complete companion does not waive an existing failed
gate or establish success of the full native/legacy linter task.

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

Resolve the existing companion from the recorded binding and direct description
link. Require one open task-owned PR with its head in Azure/azure-rest-api-specs
and base `typespec-next`; disagreement, multiple candidates or a closed/merged PR
blocks mutation. Preserve the same PR number and source branch name. Do not
silently create a replacement, retarget or close the old PR.

1. Confirm all old owners/commands are stopped and the owned source worktree is
   clean at the recorded remote head. Retain the old head/base, patch, report
   and failed attempts outside tracked consumer source. Unrelated or unpublished
   changes must not be discarded.
2. Capture the remote suppression head SHA once, fetch current `typespec-next`,
   and redo the causality/report analysis against the current linter and
   compatible existing CI evidence. Do not reuse the old suppression patch.
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
   and return the new identities. No local validation or CI/merge work is added.

If a linter edit makes a previously published companion stale, record that
fact and its pinned source identity. Do not automatically refresh during a
review loop or claim an old proposal matches the new head.

## Ledger and handoff

Record initial/default versus explicit-refresh mode, task/linter PR and head,
CI/specs provenance, causality/exclusions, raw and unique counts, report identity,
consumer base, companion PR/repository/source branch and head, description links,
old/new identities and captured lease for refresh, publication attempts and
proposal status (`published`, `not-needed`, `pending-evidence` or `blocked`).
Carry existing task counters; refresh does not reset them or create a semantic
repair cycle. Report proposal status separately from full linter readiness.
