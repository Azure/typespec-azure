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
whole input and both publication roles before costly setup. Resources are:

- Native task worktree/branch based on fetched canonical `main`; canonical
  head and one PR against `Azure/typespec-azure:main`.
- Isolated writable specs runtime at the selected baseline's specs commit.
- Evidence worktree/branch in the verified signed-in user's personal fork.
  The evidence role is not permission for a fork native/skill PR.
- Specs source retention under the [evidence contract](evidence.md#specs-source-retention):
  prefer a verified personal specs preservation branch at the frozen source SHA,
  with source recovery and publication capability recorded separately.
- A versioned tooling checkout and immutable validation snapshot only when
  needed. Canonical `main` need not contain the comparison package or skills.

All execution checkouts obey `worktrees_folder` physical containment, ownership
and non-overlap checks. Only recorded shared tooling/evidence resources may be
reused between tasks, serially under a lock; a writable specs runtime must not
be shared concurrently. Keep task execution logs ignored, with the existing
append-only timestamps/heartbeat contract.

For new tasks, resolve latest canonical base/specs once. On subsequent runs use
the selected baseline and recorded SHAs, not a newly fetched specs tip. Never
substitute arbitrary latest compiler packages: use the candidate's compatible
closure and actual core gitlink. Verify prerequisite layers before installing;
install only missing/invalid dependencies or changed manifests.

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
   [validation](../typespec-lint-validate/SKILL.md). Keep one canonical behavior
   suite; test every member's meaningful branches and valid controls. Include
   A-only/B-only/both/neither and interaction cases where authorable; document
   implications rather than invent impossible cases. Map legacy fixtures to
   native behavior or separate comparison evidence; retain noise attribution,
   emitted snapshots and supported-shape research where their claims need them.
   Framework-only cases have a justified disposition, not mandatory duplication.
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
4. **Compare and investigate.** Use
   [official-package coverage](../analyze-native-lint-coverage/SKILL.md), a
   compatible retained baseline, representative preflight, then the declared
   full required population. Apply the count policy below and
   [gap analysis](../analyze-swagger-typespec-lint-gap/SKILL.md).
   Keep compile/parse/worker/projection failures unassessed. Investigate every
   one-sided project and both directions of outliers. Do not change the rule
   simply to equalize counts. A reduced pilot is not a full-run pass.
5. **Checkpoint A: development review.** After all required development checks
   and independent local review, publish/update the one native draft PR, with
   pushed evidence links. Run a separate
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
and [evidence contract](evidence.md). Create latest once, reuse compatible
completed data, and refresh into a new immutable baseline. Separate frozen
emitter/Swagger inputs from changed native artifacts. Specs SHA equality alone
does not establish compatibility; compiler/emitter/metadata/dependency/policy
changes invalidate affected evidence. Never claim unsupported caching or invent
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
Keep legacy as the default until singleton and many-to-one pilots, cached second/
third runs, fork replay, failure/attribution controls, both review checkpoints
and app/explicit publication routing have actually passed. Text instructions
or a historical eight-project pilot do not satisfy those rollout gates.
