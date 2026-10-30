# Native-first migration tasks

This is the `flowVersion: native-first` execution contract for
[/do-linter-development-task-one-by-one](SKILL.md#select-the-flow-before-parsing-or-preparing-tasks).
It is not a new shell command or permission to execute the legacy promotion
flow. A task contains one or more Swagger validator IDs mapped to one coherent
native rule. General many-to-many groups remain out of scope.

## Input and group admission

Parse queue-level `--flow`, `--worktrees-folder` and `--task-file` exactly once,
with quoted paths as one value. Reject duplicate/unknown options and missing
values before setup. Default the folder to `C:\dev\worktrees` independently of
cwd. Require absolute drive/UNC paths; normalize separators/case, reject
unresolved variables, wildcards and drive-relative paths, then apply physical
containment before mutations. Never execute input as shell text. Ignore blank
lines/code fences; an option-only invocation prepares nothing.

Plain rule IDs remain separate sequential singleton tasks. Structured tasks use:

```json
{
  "schemaVersion": 1,
  "tasks": [
    {
      "id": "shared-policy",
      "validatorRules": ["SwaggerRuleA", "SwaggerRuleB"],
      "nativeRule": "@azure-tools/typespec-azure-core/use-shared-policy"
    }
  ]
}
```

These are placeholder IDs, not an approved mapping. `nativeRule` is optional
until destination discovery; a supplied ID is a proposal, not authority to
override semantic ownership. Run the read-only validator from the tooling root:

```powershell
mise exec -- python -X utf8 .github\skills\do-linter-development-task-one-by-one\native_tasks.py `
  --task-file C:\dev\migration-tasks.json `
  --catalog C:\dev\worktrees\lintdiff-migration-new\packages\typespec-lintdiff\catalog\validator-rule-metadata.json
```

Use actual absolute paths. A malformed document blocks the invocation. A valid
document returns every task with `valid`/`invalid` and errors; exit 1 means some
entries are invalid. Persist the complete result, fail those entries, and
continue valid entries in order after all preflight checks. No helper result
authorizes setup by itself. Native targets and paths selected later need another
collision check. Existing-task flow, membership and public IDs cannot be silently
changed by rerunning the helper.

Before dependencies or rule implementation, perform per-member
[intake](../lintdiff-rule-intake/SKILL.md) and
[existing-coverage classification](../lintdiff-rule-migration-overseer/SKILL.md#existing-rule-coverage-contract).
Check actual upstream registration, audience, severity, options, exceptions,
target/unit, supported authorable shapes and merged migration evidence. An
ARM/Both catalog label alone does not establish RPaaS or SDK applicability.

Admit a group only with one coherent native responsibility and destination.
Explain enablement, severity, options and suppression at the shared public ID.
If independent controls are necessary and no supported coherent configuration
exists, keep separate native rules and share helpers. Similar names or loops
are not admission evidence. Prefer extending an existing coherent native rule;
do not rename/remove released IDs or change defaults merely to consolidate.

Freeze task ID, membership revision/hash, destination, contract and comparison
profiles before work. Discovered related rules are suggestions, not automatic
scope expansion. Return a split recommendation if admission fails; do not
silently develop a subset. A later split/expansion needs explicit authorization
and a history-preserving handoff, never fresh retry budgets.

## Prepare one native publisher and separate evidence

Follow [preparation](preparation.md#native-first-preparation) and
[publication](app-session-execution.md#native-first-publication). Verify the
whole input and both publication roles before costly setup. Use three persistent
worktrees, preferring compatible local resources under the
[reuse contract](preparation.md#native-first-worktree-reuse):

- Native task worktree/branch based on fetched canonical `main`; canonical
  head and one PR against `Azure/typespec-azure:main`.
- Isolated writable specs runtime at the selected baseline's specs commit.
- Combined coverage/evidence worktree/branch in the verified signed-in user's
  personal fork.
  Store coverage runs, replay inputs, reports and `migration.md` here; large or
  machine-specific local inputs stay ignored. No fourth persistent replay
  worktree is required.
  The evidence role is not permission for a fork native/skill PR.

Additional required inputs and checks do not add persistent worktree roles:

- Specs source retention under the [evidence contract](evidence.md#specs-source-retention):
  prefer a verified personal specs preservation branch at the frozen source SHA,
  with source recovery and publication capability recorded separately.
- Pinned tooling reused from a verified existing source or recovered in the
  evidence worktree's ignored local area. Canonical `main` need not contain the
  comparison package or skills. Keep required immutable validation snapshots
  and independent fresh-checkout recovery verification temporary.

All execution checkouts obey `worktrees_folder` physical containment, ownership
and non-overlap checks. Recorded shared specs/tooling/evidence resources may be
reused between tasks, serially under a lock; a writable specs runtime must not
be shared concurrently. Do not reuse a native publisher for an unrelated task
without the required new branch/publication binding. Keep task execution logs
ignored, with the existing append-only timestamps/heartbeat contract.

For new tasks, discover and pin the
[shared Swagger baseline first](../analyze-native-lint-coverage/shared-baseline.md),
before selecting specs or installing dependencies. Record its metadata commit
and immutable descriptor/archive identity. Select the canonical candidate base
once, but prepare specs at the descriptor's frozen `source.commit`, not the
metadata commit or a newly fetched specs tip. Missing/corrupt/incompatible
shared data blocks migration; only a separately requested producer refresh
runs the Swagger suite. Changing validator IDs alone does not invalidate the
all-production-ARM observation baseline. Never
substitute arbitrary latest compiler packages: use the candidate's compatible
closure and actual core gitlink. Verify prerequisite layers before installing;
install only missing/invalid dependencies or changed manifests.

Apply the [monthly evaluation snapshot](../analyze-native-lint-coverage/shared-baseline.md#monthly-evaluation-snapshot):
new native branches use current canonical main, but coverage reuses the same
specs commit throughout the dependency-upgrade cycle. New PRs or source SHAs
alone do not justify baseline refresh. Assume current-main compiler and libraries
remain backward-compatible with the frozen specs, and explicitly use the supported
`--baseline-policy frozen-reference` with `--baseline-run`. Keep saved Swagger
diagnostics and run fresh native diagnostics over the full frozen population.
Preserve both runtime identities and investigate actual compile failures and
diagnostic gaps. A strict verifier's runtime-closure mismatch alone is not a
blocker; this assumption does not prove identical emission or semantic equivalence,
authorize refresh, or waive any required gate.

## Execute one implementation, with two review checkpoints

1. **Classify and discover.** Run the native
   [contract](../shared/native-migration-contract.md) and select Azure Core,
   Resource Manager or TCGC from native policy ownership. Create a member matrix:
   validator, source/audience, material checks, native branch, target/unit,
   violating/compliant test, comparison profile and conclusion. Already covered
   or template-enforced tasks do not create duplicate rules. Update owning
   provenance/guidance through an authorized documentation-only PR when needed,
   or record the exact outstanding handoff. Uncertain classifications block.
2. **Implement and validate natively.** Use
   [implementation](../typespec-lint-implement/SKILL.md) and
   [validation](../typespec-lint-validate/SKILL.md), following the shared
   [analysis-first edit loop](../shared/analysis-first-lint-migration.md).
   Decide fixes from upstream/native semantics and saved evidence, then use
   focused regressions. Do not launch full coverage for each source edit.
   Keep one canonical behavior
   suite; test every member's meaningful branches and valid controls. Include
   A-only/B-only/both/neither and interaction cases where authorable; document
   implications rather than invent impossible cases. Map legacy fixtures to
   native behavior or separate comparison evidence; retain noise attribution,
   emitted snapshots and supported-shape research where their claims need them.
   Framework-only cases have a justified disposition, not mandatory duplication.
   After focused checks pass, obtain an early independent local semantic review
   of the complete native source diff before packing an immutable candidate or
   starting expensive full coverage. Use the retained development local reviewer
   and existing ownership, capability and correction-budget gates; keep the worker
   idle during an outer-owned review. Address valid findings before artifact
   preparation. This source-only pass is not final acceptance: retain the same
   reviewer to inspect later changes and artifact/coverage evidence before
   publication. Source changes still invalidate affected checks and full-population
   evidence; an earlier clean review cannot certify changed source.
3. **Validate actual artifacts.** Build/pack a clean immutable candidate input,
   retain source-to-artifact identity and verify loaded compiler/lint packages.
   Run real injected-package positive/compliant controls before expensive
   representative/full runs. Skipped controls are not passing evidence.
   Do not bypass clean-input checks for unpublished work: use a verified
   isolated content snapshot, retain base/diff/file hashes, and prove that the
   final task commit has exactly the tested source. If available tools cannot
   establish that identity, stop rather than claiming a dirty build came from
   HEAD. Complete required checks and independent local review before the task
   commit/publication.
4. **Compare and investigate.** After coherent edits and focused checks stabilize,
   record the coverage question/gate, estimated cost and runtime budget under the
   shared analysis-first policy. Use
   [official-package coverage](../analyze-native-lint-coverage/SKILL.md), a
   pinned shared compatible baseline, lightweight injected positive/compliant
   preflight controls, then the declared
   full required population. Apply the count policy below and
   [gap analysis](../analyze-swagger-typespec-lint-gap/SKILL.md).
   Keep compile/parse/worker/projection failures unassessed. Investigate every
   one-sided project and both directions of outliers. Do not change the rule
   simply to equalize counts. Read the full saved population and selected
   index/shard; an absent shard requires production-registration/audience proof
   before reporting zero rather than not-evaluated. A reduced pilot is not a
   full-run pass. A full unfiltered baseline cannot be reused with a filtered
   pilot or different scope; do not silently regenerate Swagger.
   For an evidenced template/library outcome without a registered native lint,
   use the explicit [native-package evidence lane](../analyze-native-lint-coverage/package-evidence.md).
   Preserve injection, controls, full population, investigation and both reviews;
   native finding/comparison metrics are not applicable, not zero or equivalent.
5. **Checkpoint A: development review.** After all required development checks
   and independent local review, publish/update the one native draft PR, with
   the shared [PR title and two-section body](../shared/migration-pr-description.md).
   Native rule implementations use
   `[Swagger Linter Migration] <ValidatorRuleId> -> <OfficialTypeSpecRuleName>`,
   matching promotion PRs; the destination name is the final unqualified
   `createRule({ name })` value, not the validator slug.
   Link the published `migration.md`, which retains all required evidence.
   Run a separate
   [/loop-for-fix-and-review](../loop-for-fix-and-review/SKILL.md#native-migration-context)
   invocation carrying `flowVersion: native-first`, task/members and
   `checkpoint: development-review`. Preserve the full five-round limit,
   persistent agents, verified review-specific collection and parent approval.
6. **Checkpoint B: release readiness.** Keep the same native publisher/PR.
   Apply the shared native contract's full package/docs/ruleset/integration
   requirements, a separate independent local readiness review, and a fresh
   GitHub review/fix invocation with `checkpoint: release-readiness-review`.
   Do not call promotion, copy the rule or create a second native PR. Even at
   the same SHA, record a separate review result, purpose and invocation ID.
7. **Finalize and publish evidence.** Verify the actual pushed native SHA,
   current applicable A/B reviews, required checks, evidence commit/assets and
   all links. Preserve intentional differences and limitations. Confirm every
   command/worker/review agent stopped before preparing the next task.

If B changes production semantics, invalidate affected tests/coverage and return
to A on the new content, then B. Documentation-only fixes repeat affected
examples/generated-doc checks and B; reuse A only with unchanged applicable
content/inputs. No prior clean review covers changed production semantics.

## Counts, completeness and correspondence

Comparable diagnostic counts are the primary quantitative measure.
Member-specific semantic tests establish completeness; project sets are a
population/regression guardrail. First align audience, successful population,
API version, reachability, options and suppressions. Generic location filtering
does not reevaluate arbitrary version-sensitive predicates.

For each project record combined Swagger raw/comparable count `S`, native
raw/comparable count `N`, `N - S`, absolute difference and
`abs(N - S) / max(N, S)` (zero if both zero). Across projects report both totals,
equal-count project count, sum of Swagger-higher excess `max(S - N, 0)`, sum of
native-higher excess `max(N - S, 0)`, and total absolute difference. Do not let
opposite differences cancel through a net corpus total.

Choose the counting unit before the run. Sum distinct member violations; count
proven overlapping actionable defects once when that is the native contract.
Same paths/locations are not proof of cross-validator overlap or permission to
merge distinct native violations. Preserve raw member observations and tested
normalization receipts. If no trustworthy normalization is available, retain
separate counts and uncertainty instead of manufacturing equal comparable units.

Aim for equal comparable counts; investigate every residual. Explained
multiplicity/scope/intentional differences need code-backed evidence.
A predeclared absolute/relative closeness threshold may prioritize analysis,
never waive an unexplained gap or a missing low-frequency member. Equal counts
can hide missing findings plus false positives; inspect diagnostic outliers and
keep discriminating member controls, including missing-member and wrong-but-equal
negative controls. Full overlap or count agreement alone is not equivalence.

Per-member native counts/coverage/correspondence require deterministic tested
attribution. Whole-group count comparison does not require artificial Swagger
IDs on production diagnostics. If attribution is unavailable, mark that member
detail unassessed, retain its Swagger observations and semantic conclusion, and
do not publish an invented percentage. That reporting limit alone is not a
production defect; an unanswered required semantic question, unexplained group
gap or execution failure still blocks success. General many-to-many analysis
requires a separate design.

## Baselines and evidence publication

Follow the [coverage lifecycle](../analyze-native-lint-coverage/SKILL.md#baseline-lifecycle)
and [evidence contract](evidence.md). Discover/pin shared completed data first,
reuse it across rules, and reserve fresh source selection/Swagger execution for
an explicitly requested separate producer refresh into a new immutable baseline.
Keep shared input read-only and each parallel candidate's writable specs runtime
separate. Separate frozen
emitter/Swagger inputs from changed native artifacts. Specs SHA equality alone
does not establish identical emission. Historical-reference reuse assumes
backward compatibility across recorded compiler/library upgrades, without
relabeling old Swagger observations as generated by the current candidate.
Actual source/population drift, required failures and unexplained gaps invalidate
affected claims. Never claim unsupported caching or invent
CLI flags. Verify the actual tooling version/interface and its documented limits
before dispatch. Missing required runtime/profile/snapshot capability is an
explicit prerequisite blocker, not permission to weaken a gate.

## Ledger, recovery and finish criteria

Keep task ID, `flowVersion`, membership revision, per-member outcome, contract,
native/evidence publication bindings, specs retention repository/ref/SHA or
documented fallback, exact runtime/tooling paths and hashes,
baseline ID, candidate snapshot/source/artifacts, fixture/claim map, validation
plan/results, A/B local and GitHub receipts, PR tuple, evidence commit/assets,
original deadlines/dispatch IDs, recovery decisions and append-only history.
Native-first tasks have no promotion PR or immutable temporary source.

Preserve [task recovery](../shared/recovery-context.md#native-first-task-scope):
initial cycle plus at most three task-wide semantic repair cycles; one eligible
setup-only orchestration retry; three local draft corrections per phase/cycle
and existing per-round review allowance; three coordinator reserve attempts;
one native timeout diagnosis; one baseline comparison; the existing bounded
setup-hook diagnostic/correction. Group size never multiplies allowances.
Map development and promotion phase counters to development and readiness;
returning to a phase or resuming a task never resets them. Preserve the current
eligibility, explicit-authorization and quiescence rules, not just the numbers.

Shared predicate/helper fixes revalidate all potentially affected members; when
isolation is unproved, rerun every member. Compatible unchanged Swagger inputs
may still be reused. Network/access/publication failures are not semantic
repair cycles. Preserve uncertain publication state and reconcile exact remote
identity before any allowed retry. Closed/merged PRs require their existing
explicit transition; no automatic replacement, retargeting or force-push.

Report queue task totals separately from member outcomes. For implementation:
`succeeded` requires the correct native PR, both current applicable clean
checkpoints, all required checks, explained count gaps and verified published
evidence; `partially-succeeded` means a PR exists but required work is unfinished;
`failed` means unsuccessful work before that PR. Record a separate disposition
for already-covered, template-enforced, documentation-only or blocked outcomes;
do not label an evidence-only classification as a completed new rule.

For every task report native worktree, native PR/actual pushed SHA, A/B local and
GitHub results, baseline/evidence commit, member matrix, repair usage, log path
and limitations/blocker. Keep paths in separate copyable text blocks. Pending
tasks remain pending if prior activity cannot be verified stopped.

The coordinator alone owns task-level completion/attention notifications and
consolidated post-run process review. Workers return suggestions only. Finish
without asking questions during autonomous queue execution; return exact
blocker evidence and preserve resources when safe recovery is exhausted. The
coordinator follows its notification/authorization policy without inventing
permission. Keep one top-level worker and one writer at a time. Never prepare a
later task until the current task is terminal and every owner/command is stopped.
Retain original readiness/status/quiescence deadlines and the existing finite
reconciliation procedure, not an unlimited wait or polling loop.

Finish the task and review loops before applying the existing independent skill-update
policy; native-first does not authorize recursive or mixed post-run skill PRs.
Native-first is the default for new rule-ID and task-file queues, not a waiver
of validation or evidence requirements. Keep singleton and many-to-one pilots,
cached second/third runs, fork replay, failure/attribution controls, both review
checkpoints and app/explicit publication routing in acceptance tracking.
Record unverified paths as unverified; changing the default does not establish
that these checks passed. Text instructions or a historical eight-project pilot
do not replace the required evidence or any applicable task gate.
