---
name: lintdiff-rule-promote
description: Promote a named LintDiff rule from packages/typespec-lintdiff into the correct official TypeSpec Azure library, assuming it is done, with a clean worktree, agent-recommended destination by default (or user-confirmed destination when requested), native tests/docs/ruleset wiring, validation, and a draft PR. Use when the user names a migrated lintdiff rule and asks to move or promote it to typespec-azure-core, typespec-azure-resource-manager, or typespec-client-generator-core.
argument-hint: "[validator rule id or local rule name] [ask for confirmation]"
user-invocable: true
---

# LintDiff rule promotion

Use this skill when a migrated rule in `packages/typespec-lintdiff` is ready to be
promoted into an official TypeSpec Azure library.

Promotion is a handoff workflow, not a rule-design workflow. The rule's source
PR in `packages/typespec-lintdiff` remains the source of truth while the
official-library PR is prepared in a clean worktree.

Before expensive source investigation, setup or edits, apply the shared
[publication preflight](../do-linter-development-task-one-by-one/app-session-execution.md#publication-preflight)
and lifecycle classification for standalone as well as queued runs. Select the
backend, owner, worktree, canonical base, head repository and push destination.
For session-bound tools, standalone promotion also needs its own verified app
owner based on canonical `main`; use the promotion subset of the queue-owned
[workspace preparation contract](../do-linter-development-task-one-by-one/preparation.md).
Queued promotion consumes the bundle prepared before development and never
creates its own worktree. Do not first create a plain Git worktree that the
required tool cannot publish. Completion delivery is needed only when delegated.
`origin` below denotes the verified canonical fetch remote; substitute its actual
name when different. Publication-only recovery uses the shared recovery contract,
not another source investigation or promotion run when validation remains valid.

## Native semantic boundary

Apply the development skill's
[Native TypeSpec implementation boundary](../develop-lintdiff-rule/SKILL.md#native-typespec-implementation-boundary)
to the promoted rule and its reachable helpers, including during source
inspection, adaptation, and independent review. A source rule assumed done is
not exempt from this boundary.

Use native types and structured metadata to establish identity, versions, and
other semantic properties. Do not infer them by matching or parsing generated
OpenAPI reference strings, including strings returned by an otherwise allowed
Azure library. Prefer the underlying supported record API over a
construction/parsing round trip: for ARM common types, use
`findArmCommonTypeRecord(...)` and its fields rather than parsing
`getArmCommonTypeOpenAPIRef(...)`. An external reference to a standard type does
not establish native type identity. Reference-formatting helpers remain
appropriate for emitters, not for inferring native lint semantics.

Preserve version-selection and fallback policy, diagnostic population, and
diagnostic targets when replacing reference-based logic, unless a semantic
change has been justified through the source-repair workflow. Handle returned
metadata-resolution diagnostics explicitly using repository conventions; do not
discard them or silently treat failed resolution as compliance. Require
regression evidence that a resolved record is checked independently of generated
reference path formatting. If supported metadata cannot establish the property,
report the limitation rather than adding a reference-string heuristic.

Follow the existing finding classifications before editing. A proven
behavior-preserving destination adaptation can be made only in the promotion
worktree with supporting evidence and documentation. A source-semantic defect
blocks promotion and returns to the authorized repair workflow; this boundary
does not authorize modifying the immutable source or silently changing semantics
only in the official copy. Architectural coupling alone is not proof of an
affected service or a source-semantic defect; report uncertain findings as such.
See the
[review on PR #5271](https://github.com/Azure/typespec-azure/pull/5271#issuecomment-5661318416).

## Preconditions

- The user must name the rule. Assume a rule named for promotion is done for
  this run; do not ask the user to mark it done or verify a separate done-status
  flag in catalog metadata, fixtures, or linter registration.
- Wording like "start with `<RuleName>`" or "promote `<RuleName>`" is sufficient
  in a promotion conversation. This is a per-run assumption, not a persistent
  metadata change or a claim that the user explicitly marked the rule done.
- If the rule semantics are still under review, stop and send the user to the
  lintdiff development or repair flow first.
- Do not edit or clean up the current lintdiff worktree as part of promotion.
  The promotion PR must be created from a separate worktree.
- Fetch the promotion base from canonical `Azure/typespec-azure:main` and
  create the dedicated promotion source (head) branch in `Azure/typespec-azure`,
  never a personal fork. Existing task PRs keep their verified head branch;
  retaining a legacy fork requires the exact
  [fork-update authorization](../shared/recovery-context.md#existing-fork-updates).
  Verify URL identity and applicable push permission, not remote names; never
  fall back to a fork after a failed push.
- Treat the source lintdiff rule as immutable during promotion. Do not
  change `packages/typespec-lintdiff` source, fixtures, snapshots, package
  manifests, or docs unless the user explicitly redirects from promotion back to
  rule repair.
- Use the shared preparation contract's validator-based branch/worktree naming.
- The canonical validator rule slug is for source traceability, branch names, and
  worktree names. It is not automatically the official TypeSpec rule name. Choose
  the promoted rule's user-facing `createRule({ name })` using the TypeSpec
  linter naming convention: short kebab-case, `no-<thing>` for banned constructs,
  `use-<preferred-thing>` for preferred patterns, and concise subject-oriented
  names such as `<subject>-missing-<thing>` or
  `<subject>-invalid-<condition>` when `no-`/`use-` does not fit. Do not include
  the package or library name in `name`. Example:
  `LatestVersionOfCommonTypesMustBeUsed` should be promoted as a concise rule
  name such as `use-latest-version-of-common-types`, not the full validator slug.

## Confirmation policy

Use "do not ask" mode by default: proceed with the agent's evidence-backed
recommendation instead of pausing for routine confirmation. The user does not
need to add "do not ask" to the promotion request. If the user explicitly asks
for confirmation, pause at the applicable confirmation points for that run.

- "Do not ask" skips confirmation pauses only, never blocker stops. All existing
  blocker classifications and stop conditions remain unchanged and take
  precedence over this default. When a stop condition is met, stop and
  report the blocker; do not bypass it or continue on the agent's recommendation.
- Still perform the destination analysis and state the selected package and
  reasons, then continue directly. Honor any destination already specified by
  the user rather than replacing it with the agent's preference.
- Apply this policy to routine confirmation points throughout the run. Record
  agent-selected decisions as such in the PR; do not claim the user explicitly
  selected them. An explicit request for confirmation applies only to that run;
  subsequent runs retain the "do not ask" default.
- Keep ruleset entries `false` unless the user separately approves immediate
  enablement. "Do not ask" alone is not approval to enable new diagnostics.
- Apply the `int:azure-specs` label directly when appropriate and permitted; if
  labeling is blocked, report that limitation without asking.
- This mode does not waive the named rule precondition, source
  immutability, required validation, or repository permission requirements. If
  prerequisites are missing, evidence cannot support a safe recommendation, or
  a source-semantic gap requires reopening repair, stop and report the blocker
  without asking. The done-status assumption applies in both modes; do not
  reopen source repair automatically. Queue-controlled runs return the structured
  handoff below instead of asking; only the outer queue may start source repair.

## Queue-controlled promotion and resumption

When invoked by `/do-linter-development-task-one-by-one` with the
`lintdiff-development-queue` marker and a
[cycle handoff](../do-linter-development-task-one-by-one/SKILL.md#cycle-handoff),
apply this narrowly scoped contract. Standalone promotion behavior is unchanged.

- Inherit `worktrees_folder` and the publication operation from the handoff.
  Reuse only the in-folder promotion checkout; never fall back to the current
  session's cwd. Use the shared existing-PR path for updates and the exact
  worktree-owning session for new PR creation.
- Require a clean, successfully reviewed development PR head. Verify its
  canonical PR identity, current pushed SHA, and local source worktree against
  the handoff. Pin that exact commit as immutable source for this invocation;
  do not silently consume a newer branch tip or uncommitted source changes.
- Use the existing destination analysis, canonical `origin/main` base,
  disabled-by-default rulesets, and required validation. Do not wait for the
  development PR to merge. Pass the queue's no-skill-edits/no-skill-update-PR
  constraint to all delegated agents and append milestones to the shared log.
- On every queue cycle, including initial promotion, require the separate
  promotion worktree and readiness manifest already prepared by the queue.
  Reverify the recorded base, branch, current state and dependency fingerprints;
  do not create/select a new checkout or repeat setup that still passes.
  Missing or mismatched preparation is a blocker returned to the queue.
  When the handoff selects
  [app-session execution](../do-linter-development-task-one-by-one/app-session-execution.md),
  reuse the supplied, verified app-owned promotion worktree even on cycle `0`.
  Its main session agent owns PR creation. Verify its `origin/main` base and
  distinct branch before any invalidated setup; do not create a third worktree or publish from
  the development/coordinator session. Keep the app-returned directory name
  and record the canonical validator slug in the branch suffix and handoff.
  Report its absolute path and branch as soon as selected, including on failure
  before PR creation.
- On a repair cycle, reuse the recorded promotion worktree, branch, and open
  draft PR when they exist. Verify repository/base/head identities and the
  recorded pushed promotion SHA before changes. Do not create replacements,
  close PRs, reset, rebase, or force-push. If the PR was closed/merged or state
  changed outside the handoff, stop.
- The queue's recorded unfinished promotion edits may be resumed only when the
  worktree state manifest proves their exact content and task ownership. This is
  the sole exception to clean-worktree preparation/reuse requirements; unrelated,
  unexplained, or externally changed edits remain blockers. Do not clean, stash,
  overwrite them, or make speculative checkpoint commits. Promotion PR review
  still requires a clean worktree at the pushed head.
- For a legacy checkout, accept the queue's verified
  [adoption binding](../do-linter-development-task-one-by-one/app-session-execution.md#authorized-legacy-worktree-adoption)
  without recreating the checkout. An exhausted correction budget may resume
  only under the queue's recorded
  [explicit bounded authorization](../do-linter-development-task-one-by-one/SKILL.md#explicitly-authorized-bounded-resumption).
  Preserve the original counter and separately consume the authorized allowance;
  neither adoption nor a fresh dispatch resets it.
- After source repair and a new clean development review, refresh the native
  implementation from the new pinned source commit. Preserve valid prior
  promotion adaptations and review fixes; reconcile changes incrementally rather
  than blindly copying over files or merging/cherry-picking the whole development
  branch. Update native regression coverage, fixture mappings, docs, and PR
  provenance, including the previous and new source SHAs and reason for refresh.
  Re-run required promotion validation before appending and pushing new commits.
- If a verified source-semantic defect is found during preparation, validation,
  or review, stop this invocation without modifying the source or implementing
  divergent semantics only in the official copy. Return
  `source-repair-required` with the cycle handoff's complete defect evidence,
  acceptance criteria, both PR/worktree identities when available, and the
  manifest of any unfinished promotion edits. A failing command or review comment
  alone is not proof of a source defect.
- Only the outer queue decides whether its three-repair budget permits a new
  worker. This queue invocation supplies advance repair authorization, replacing
  the standalone requirement to ask the user to reopen repair; it does not
  waive this skill's source-immutability or stop conditions. Uncertain findings,
  adaptation issues, and operational blockers must not be relabeled
  `source-repair-required`; record any accompanying operational blocker.

## Fast path for repeat promotions

After the first promotion in a repo, use this optimized order unless the rule
needs special investigation:

1. For standalone promotion, run the destination analysis after publication
   preflight and before dependency preparation. Proceed with the agent's
   recommendation, or obtain the user's choice when confirmation was requested.
   Queue runs already have a base environment; destination analysis still
   precedes adaptation and destination-specific builds, not checkout creation.
2. Read checked-in source evidence from the existing source worktree or fetched
   git refs; prefer source branches and worktrees whose names use the canonical
   Swagger validator rule slug. Do not create a source worktree just to inspect
   files that can be read with `git show <ref>:<path>`.
3. Complete the prepared-environment gate in process step 3 below.
4. Do not run the lintdiff harness during promotion. The source rule's
   `migration.md` is the source of migration evidence; use source package build
   plus native target tests for promotion validation.
5. Convert fixture coverage with the standard mapping in step 5 instead of
   copying snapshots or recreating the full harness layout.
6. In a fresh worktree, build the target package dependency closure once before
   running `vitest` directly; otherwise tests may fail only because workspace
   packages such as `@typespec/compiler` have no `dist` output yet.
7. Run a focused review after the native rule and tests compile, before broad
   package validation. If the review finds a source-semantic issue, stop and
   report that promotion is blocked by a source-rule gap; do not repair the
   lintdiff source as part of promotion.
8. Validate in this order: one-time target-package dependency-closure build if
   needed, focused rule test, affected package build/lint, required target-package
   `regen-docs`, inspection and formatting of the generated package README and
   website linter/rule references, rulesets build/test, affected package test.
   Do not build the website or its dependency closure locally.
9. For broad local validation, set `TYPESPEC_SKIP_WEBSITE_BUILD=true` when
   running the repo build or `pnpm validate:pr`. Apply the
   [bounded broad-validation monitoring](#bounded-broad-validation-monitoring)
   procedure below; wrapper silence alone does not establish a stall. Record
   any incomplete broad validation in the PR. Rely on CI's dedicated Website
   job for the authoritative Astro check and build.

`pnpm validate:pr` is intentionally broad: it fetches/checks the branch, then
runs full-repo build, test, lint, format check, spelling check, docs regen,
changeset validation, and diff hygiene. It is not affected-file-aware except for
the changeset and final diff checks. For promotion PRs, prefer the targeted
validation commands below and only use bounded `validate:pr` with
`TYPESPEC_SKIP_WEBSITE_BUILD=true` as a final best effort.

## Process

### 1. Identify the source rule

1. Resolve the user input to both:
   - the validator rule id, usually `test/fixtures/<ValidatorRuleId>/rule.md`
   - the local TypeSpec rule name, usually `src/rules/<rule-name>.ts`
     Then derive the canonical validator rule slug from the exact validator rule
     id. Use this slug, not the local TypeSpec rule file name or destination
     package, when naming or matching source branches and worktrees.
2. Inspect the source rule and evidence:
   - `packages/typespec-lintdiff/src/rules/<rule-name>.ts`
   - `packages/typespec-lintdiff/src/linter.ts`
   - `packages/typespec-lintdiff/test/fixtures/<ValidatorRuleId>/rule.md`
   - relevant fixture cases under `test/fixtures/<ValidatorRuleId>/`
   - `packages/typespec-lintdiff/docs/validate-report.md`
   - `packages/typespec-lintdiff/catalog/catalog.json` and
     `catalog/validator-rule-metadata.json` when present
3. Do not run lintdiff harness validation as part of promotion; rely on the
   source rule's checked-in migration evidence.
4. Record the lintdiff source branch, commit and source location: use an existing
   verified worktree or read a fetched ref with `git show <ref>:<path>`. Honor
   app-returned paths regardless of directory naming. Do not create a source
   checkout as part of promotion; a separately requested source workspace follows
   the shared development preparation contract.
5. If there are uncommitted source-rule changes, treat the current working tree
   as the source only after making that explicit in the PR description.

### 2. Recommend and select the destination library

Analyze first, then present a recommendation with reasons. By default, select
the recommended destination and continue directly under the confirmation policy.
Honor a user-specified destination. Ask the user to choose before moving files
only when they explicitly requested confirmation.

Use these signals:

- Prefer `@azure-tools/typespec-client-generator-core` (TCGC) when the policy
  governs generated SDK APIs, including common SDK method names. Check this
  semantic ownership before routing an ARM-origin validator to ARM. Compare
  related SDK rules and supported name resolution (for example,
  `getLibraryName(..., AllScopes)` for a common-name contract); raw
  `operation.name` and emitted `operationId` are not interchangeable with SDK
  names. Do not introduce TCGC dependencies into Core or ARM.
- Prefer `@azure-tools/typespec-azure-resource-manager` when the rule is
  ARM-specific: it depends on `@azure-tools/typespec-azure-resource-manager`,
  inspects ARM resources, provider namespaces, ARM lifecycle operations,
  resource paths, ARM common types, ARM envelopes, or ARM RPC guidance.
- Prefer `@azure-tools/typespec-azure-core` when the rule applies to shared
  Azure REST or data-plane authoring: it depends only on compiler/http/core
  APIs, checks common Azure style, versioning, auth, LRO, response, parameter,
  or model patterns, and does not need ARM helpers.
- Treat validator metadata such as `applicability: Both`, `sources: ["common"]`,
  or fixture text that says "Both ARM and DataPlane" as strong evidence for
  `@azure-tools/typespec-azure-core`, unless the native contract governs SDK APIs
  or needs ARM-only helpers or ARM-specific semantics.
- `@azure-tools/typespec-azure-core` must not take a dependency on
  `@azure-tools/typespec-azure-resource-manager`. If a candidate core rule
  currently imports ARM helpers, either recommend ARM or explain the rewrite
  needed to make it core-safe.
- Use fixture front matter and validation-report ruleset inference as evidence,
  not as the sole authority.
- Check for existing official rules with equivalent coverage before promoting.
  If the official rule already exists, recommend updating that rule instead of
  adding a duplicate.
- Identify applicability guards that exist only because the lintdiff package
  enables ARM and data-plane rules together. Record whether the destination
  package and official ruleset already provide the same applicability boundary,
  and compare neighboring destination rules before deciding whether the guard
  belongs in the promoted implementation.
- Do not require provider namespace metadata merely because a rule is ARM-only.
  Separate the selected ruleset's audience from semantic requirements on each
  declaration. Package ownership alone does not make the compiler filter
  namespaces; establish the intended boundary from the actual execution context
  and neighboring rules.

The recommendation should include:

- suggested package
- alternative package, if plausible
- evidence from imports, rule semantics, fixture metadata, and report ruleset
- any required adaptation, such as removing lintdiff-only helpers or changing
  diagnostic names

Proceed with the evidence-backed destination by default. If the user requested
confirmation, wait for their selection before continuing. If the evidence cannot
support a safe recommendation, stop and report the blocker under the confirmation
policy.

### 3. Verify the prepared environment

Use the [shared preparation contract](../do-linter-development-task-one-by-one/preparation.md)
as the sole setup procedure: standalone promotion completes its promotion subset;
queued promotion revalidates the supplied manifest without creating resources.
Preserve the queue-controlled unfinished-state exception above. Keep the source
untouched; destination-specific builds and native validation remain required
after adaptation.

Copy only the selected rule's implementation and evidence into the prepared
promotion worktree. Do not copy generated artifacts, `dist`, `temp`, validator
snapshots, `specs/results`, full corpus output or unrelated lintdiff harness files.

Keep both PRs aligned:

- The lintdiff PR remains the source of truth for rule behavior.
- If review on the native-library PR reveals that the source lintdiff rule has a
  semantic gap, stop promotion and report the blocker. The user must explicitly
  choose to reopen lintdiff rule repair before any source changes are made,
  except for the outer queue's advance authorization under the queue-controlled
  handoff above. In that mode, return evidence and stop; never repair here.
- Do not let the promoted rule diverge from the lintdiff source without
  explicitly documenting why.

### 4. Move and adapt source code

Place the rule in the selected package:

- `packages/typespec-azure-core/src/rules/<rule-name>.ts`
- `packages/typespec-azure-resource-manager/src/rules/<rule-name>.ts`
- `packages/typespec-client-generator-core/src/rules/`, following neighboring
  rule filename/export conventions

Check the source contract against the
[implementation checkpoints](../typespec-lint-implement/SKILL.md#implementation-checkpoints).
Classify any proposed semantic change under the existing source-repair policy
before editing; selecting a better destination does not authorize divergence
from the immutable source.

Then adapt it to the destination package:

- update imports to use destination-package helpers and relative paths
- reuse existing `src/rules/utils.ts` helpers before adding new helpers
- remove any dependency on `tsp-lintdiff-local-linter`
- evaluate lintdiff-only applicability guards instead of copying or removing
  them mechanically:
  - remove a guard when it exists only to isolate an ARM-only rule from
    data-plane programs (or the reverse) in lintdiff's combined rulesets, and
    the selected official package and ruleset already guarantee that boundary
  - for an ARM-only destination, do not retain a provider-namespace presence
    check unless provider metadata or per-service filtering is genuinely part
    of the rule's contract. Removing redundant lintdiff isolation is a promotion
    adaptation, not a source-semantic repair; it does not require changing the
    immutable source rule
  - preserve a guard when the rule must still distinguish applicable and
    inapplicable services, namespaces, or declarations within the destination
    ruleset, or when provider metadata is part of the rule's semantics
  - use neighboring destination rules and ruleset registration as evidence,
    document the deliberate adaptation in the PR, and add a native test that
    would fail if the destination unnecessarily retained the lintdiff-only
    guard. Cover both ordinary and nested namespaces without a provider
    decorator when the official ruleset supplies the applicability boundary;
    keep library-declaration and template filtering as separate concerns
  - do not use `resolveProviderNamespace(program, operationNamespace)` as an
    ancestor-membership check: it searches the supplied namespace and its
    descendants. If a semantic membership check is required, verify the helper's
    traversal direction and test nested providers and unrelated services
  - do not remove a guard when destination ownership is ambiguous; return to
    destination analysis rather than broadening the rule speculatively
- update exported rule variable names to match neighboring rules
- preserve severity and diagnostic intent unless the target package convention
  or existing equivalent rule requires a better fit
- choose the official `createRule({ name })` by TypeSpec linter naming
  conventions, even when that differs from the source validator slug; if the
  name changes, keep the validator slug only in provenance, branch/worktree names,
  and PR notes
- keep diagnostic messages actionable and consistent with neighboring rules
- register the rule in the target package's `src/linter.ts`
- if the rule name changes, update tests, docs, rulesets, and PR notes with the
  old-to-new mapping

### 5. Convert tests to native package tests

Do not copy the lintdiff harness snapshots as target-package tests. Convert the
important fixture coverage into `vitest` tests using the target package's
existing tester helper:

- core: `packages/typespec-azure-core/test/test-host.ts`
- ARM: `packages/typespec-azure-resource-manager/test/tester.ts`
- TCGC: `packages/typespec-client-generator-core/test/tester.ts`; confirm the
  current context setup against adjacent rule tests

Apply the [contract-driven coverage](../typespec-lint-validate/SKILL.md#contract-driven-coverage)
checklist in addition to fixture conversion. In ARM resource examples and tests,
prefer standard operation templates with named customization arguments and
omitted defaults. Preserve handcrafted cases that specifically prove scope or
non-resource behavior. For SDK naming, prove common versus language-scoped
override behavior and the intended name domain.

Create:

- `packages/<target>/test/rules/<rule-name>.test.ts`

Use `createLinterRuleTester` and cover:

- every violating branch documented in `rule.md`
- representative compliant cases
- edge cases called out in source-of-truth notes
- regression cases for any lintdiff review fixes

Follow a neighboring native rule test's setup and teardown lifecycle, not just
its helper imports. With the Core `Tester`, create the fresh tester and rule
tester in `beforeEach`, as the package's existing tests do. Keep lazy library
filesystem/host initialization out of the first test body, await asynchronous
setup, and preserve per-test isolation. Do not compensate for setup mistakes
by raising timeouts, caching mutable testers across cases, or weakening assertions.
For recursive traversal, port the source matrix for cycles, shared siblings,
cross-operation reuse and imported diagnostic targets without silently changing
the intended diagnostic unit. Any discovered source defect returns to the queue.

When promotion adds or preserves project/library declaration filtering, include
an imported library declaration that would otherwise violate the rule and assert
that it is excluded. Pair it with a violating project declaration so the test
cannot pass merely because the rule never ran. Test template filtering separately;
ordinary and nested project namespace cases do not prove library exclusion.

For metadata-resolution or reference-based logic, explicitly cover relevant
version-selection/fallback behavior, returned resolution diagnostics, and
diagnostic targets. Prove that checking a resolved record does not depend on
its generated reference matching the old path or regex layout. Use supported
native inputs or existing test infrastructure, not production adapters or
unsupported authoring shapes added solely for testing. Fixture conversion alone
does not close a missing regression case; classify any newly exposed source
defect before making changes.

Use this standard fixture-to-native-test mapping:

- one lintdiff fixture directory usually becomes one `it(...)` case
- a fixture that exercises several independent semantic branches may become
  multiple `it(...)` cases, one per branch
- validator `expect.json`, `tsp-diagnostics.json`, `validator-diagnostics.json`,
  and `output.json` are evidence only; do not copy them into the official
  package
- use the fixture's `main.tsp` as source material, then reduce it to the
  smallest direct TypeSpec snippet that triggers only the promoted rule
- preserve compliant fixtures as `toBeValid()` tests
- preserve duplicate-diagnostic and target-location behavior with explicit
  diagnostic count or target assertions when the target package tester supports
  them
- add regression tests for semantic fixes discovered during review, even when
  they were not part of the original fixture set
- keep a written mapping from each original fixture `main.tsp` to the exact
  native `it("...")` test title or titles that replace it; do not paraphrase test
  titles in mapping tables or PR notes

Prefer direct TypeSpec snippets and expected diagnostics over OpenAPI output
snapshots. If a lintdiff fixture depends on unrelated diagnostics or
suppressions, adapt the snippet so the promoted rule is tested directly.

### 6. Move rule documentation

Create or update:

- `packages/<target>/src/rules/<rule-name>.md`

Use the lintdiff `rule.md` as source material, but rewrite it as official
library documentation:

- remove lintdiff front matter and harness-only notes
- do not add a rule heading or `Full name` block; `tspd doc` generates that
  metadata
- explain what the rule checks and why for TypeSpec authors
- focus the rationale on TypeSpec authoring, generated SDKs, API consistency, and
  Azure emitter/tooling behavior
- include realistic TypeSpec incorrect and correct examples
- for ARM resource operations, use standard templates in both examples, showing
  the invalid customization through named arguments where applicable; compile
  the examples using the existing example/test workflow
- follow the destination's authored-document conventions, including `## Impact`
  with the affected areas and `## Suppression` guidance when used by neighboring
  rules; explain when suppression is appropriate rather than only how to fix
  the violation
- keep Swagger or LintDiff provenance only in a dedicated provenance section such
  as `## LintDiff Equivalent`; link the original validator rule name to its
  source documentation or source file, and do not frame the rule primarily as
  keeping Swagger up to date
- check the generated docs page path and title match the official TypeSpec rule
  name, not the source validator slug, when the names differ

Regenerate docs for the affected library after the rule docs are in place. Let
the command complete; `tspd doc` can be quiet for several minutes after printing
the experimental banner, and stopping it early can leave generated rule indexes
and table formatting stale. Do not hand-edit generated README or website
reference entries as a substitute for regeneration. After docs regeneration,
inspect the generated target-package README and website linter/rule references
for the official rule name, page path, links, and table entry. Format the changed
Markdown files and check them with Prettier so generated tables use the expected
layout. Use the scoped empty-ignore override in step 9: ordinary Prettier
commands silently skip website references covered by `.prettierignore` and
generated rule pages covered by `.gitignore`. Leave both ignore files untouched
and do not force-add ignored generated rule pages.

For ARM promotions, also inspect the manually maintained rule matrix at
`website/src/content/docs/docs/howtos/ARM/arm-rules.md`. Add the official rule
with the correct documentation link and applicability columns, following the
table's alphabetical ordering. `regen-docs` does not update this matrix; include
it in the explicit formatting and diff review scope.

### 7. Update rulesets

Update `packages/typespec-azure-rulesets` so all official rules remain
explicitly listed.

- Newly promoted rules must be registered with a plain `false` value by default.
  Promotion adds official rule availability without enabling new diagnostics for
  existing Azure service specs. Set a promoted rule to `true` only when the user
  explicitly approves immediate enablement after reviewing integration impact.
- ARM-specific rules go in `src/rulesets/resource-manager.ts` with a plain
  `false` value.
- Core rules that apply to data-plane and ARM go in both
  `src/rulesets/data-plane.ts` and `src/rulesets/resource-manager.ts`, with a
  plain `false` value in both.
- Core rules that are not applicable to ARM, or conflict with an ARM-specific
  rule, must still be explicitly listed in `resource-manager.ts` with a plain
  `false` value and no annotation or explanatory comment, matching the existing
  resource-manager ruleset style for disabled entries.
- SDK-policy rules go in `src/rulesets/client-sdk.ts`, under `enable` with a plain
  `false` value by default. Do not place a rule in ARM/data-plane rulesets merely
  because of its Swagger origin; verify the destination's rule-discovery test
  and intended applicability before adding other entries.

For a renamed rule, verify the same public name across source, exports,
registration, tests, docs/links, generated references, and changesets. Keep
diagnostics short; put compatibility impact and suppression rationale in docs.
Keep Swagger crosswalks in the provenance section rather than the native
description or remediation.

Run or plan to run the rulesets build and test after updating the lists.

### 8. Add a Chronus change

Add a change entry for every touched official package:

- the destination: `@azure-tools/typespec-azure-core`,
  `@azure-tools/typespec-azure-resource-manager`, or
  `@azure-tools/typespec-client-generator-core`
- `@azure-tools/typespec-azure-rulesets` when its rulesets changed

Choose the change kind separately for each package:

- For the rule's destination package, use `feature` for a new official rule and
  `fix` when folding the behavior into an existing official rule.
- For `@azure-tools/typespec-azure-rulesets`, use a separate `internal` change
  entry when only registering the rule as `false`. Do not include this package
  in the rule package's `feature` entry: disabled registration does not enable
  new diagnostics.
- Describe the actual behavior using the official TypeSpec rule name. For
  example: "Register the ARM `no-query-in-post` lint rule as disabled in the
  resource manager ruleset." Do not say "Enable" when the entry is `false`.
  If the user explicitly approved immediate enablement, classify and describe
  that user-facing ruleset change accordingly instead of using this
  internal-only guidance.

Chronus change files must use LF line endings. Do not run Prettier directly on a
new change file when the Windows checkout would rewrite it with CRLF. After
formatting, run `pnpm chronus status`; if it reports `missing-front-matter`,
normalize the change file to LF and rerun the command. On Windows, a reliable
workflow for a new change file is:

```powershell
$path = ".chronus/changes/<change-file>.md"
git -c core.autocrlf=false add -- $path
cmd /d /c "git show :$($path.Replace('\', '/')) > $path"
$content = [System.IO.File]::ReadAllText((Resolve-Path $path))
if ($content.Contains("`r`n")) { throw "Chronus change file still contains CRLF" }
pnpm chronus status
```

Staging first creates an LF-normalized index blob according to the repository
attributes; `cmd` writes that blob back without PowerShell text-encoding or
line-ending conversion.

### 9. Validate narrowly, then broadly enough for PR

Use the repo's mise-managed toolchain when available.

Optimized validation order:

0. In a fresh worktree, run
   `pnpm -r --filter "<affected-package>..." build` once before direct `vitest`
   invocations if workspace package `dist` outputs are missing.
1. affected rule test file
2. affected package build
3. affected package lint, if available
4. required affected-package `regen-docs`
5. inspect the generated package README and website linter/rule references for
   the official rule name, page path, links, and table entry
6. format changed Markdown and run a Prettier check over the generated package
   README, rule documentation, and website linter/rule references, using an
   empty-ignore override and explicit filenames as shown below
7. `@azure-tools/typespec-azure-rulesets` build and test when rulesets changed
8. affected package test
9. if broad local validation is warranted, run the repo build or
   `pnpm validate:pr` with `TYPESPEC_SKIP_WEBSITE_BUILD=true`

Before running tests, consume the task's verified
[validation profile](../shared/recovery-context.md#reusable-validation-profiles).
Preserve applicable explicitly approved hook settings across focused/full runs
and review handoffs; never treat prior passing output alone as permission to
change configured timeouts. No profile grants an extra retry.

For timeout-only native test failures, apply the shared
[bounded native-test timeout diagnosis](../loop-for-fix-and-review/SKILL.md#bounded-native-test-timeout-diagnosis)
before declaring an unexplained terminal blocker. Queued promotion consumes the
queue's single task-wide allowance; it does not receive a new allowance here.
This exception does not apply to the broad build or lintdiff corpus.

Do not manually build the website package or its dependency closure during local
promotion validation. The website build script honors
`TYPESPEC_SKIP_WEBSITE_BUILD=true`, matching the general CI build jobs. CI's
dedicated Website job runs without the skip and is the authoritative Astro check
and build for generated website content.

For ARM rule promotion, use this command set as the default targeted validation
loop, setting `RULE_NAME` to the exact official TypeSpec rule name/file stem
(for example, `no-query-in-post`, not the validator slug `parameters-in-post`):

```bash
RULE_NAME="replace-with-rule-name"
pnpm -r --filter "@azure-tools/typespec-azure-resource-manager..." build
pnpm --filter @azure-tools/typespec-azure-resource-manager exec vitest run "test/rules/${RULE_NAME}.test.ts"
pnpm --filter @azure-tools/typespec-azure-resource-manager build
pnpm --filter @azure-tools/typespec-azure-resource-manager lint
pnpm --filter @azure-tools/typespec-azure-resource-manager regen-docs
pnpm exec prettier --ignore-path /dev/null --write packages/typespec-azure-resource-manager/README.md "packages/typespec-azure-resource-manager/src/rules/${RULE_NAME}.md" website/src/content/docs/docs/libraries/azure-resource-manager/reference/linter.md "website/src/content/docs/docs/libraries/azure-resource-manager/rules/${RULE_NAME}.md"
pnpm exec prettier --ignore-path /dev/null --check packages/typespec-azure-resource-manager/README.md "packages/typespec-azure-resource-manager/src/rules/${RULE_NAME}.md" website/src/content/docs/docs/libraries/azure-resource-manager/reference/linter.md "website/src/content/docs/docs/libraries/azure-resource-manager/rules/${RULE_NAME}.md"
pnpm --filter @azure-tools/typespec-azure-rulesets build
pnpm --filter @azure-tools/typespec-azure-rulesets test
pnpm --filter @azure-tools/typespec-azure-resource-manager test
pnpm exec cross-env TYPESPEC_SKIP_WEBSITE_BUILD=true pnpm validate:pr
git diff --check
```

For core rule promotion, use the same shape with the core package:

```bash
RULE_NAME="replace-with-rule-name"
pnpm -r --filter "@azure-tools/typespec-azure-core..." build
pnpm --filter @azure-tools/typespec-azure-core exec vitest run "test/rules/${RULE_NAME}.test.ts"
pnpm --filter @azure-tools/typespec-azure-core build
pnpm --filter @azure-tools/typespec-azure-core lint
pnpm --filter @azure-tools/typespec-azure-core regen-docs
pnpm exec prettier --ignore-path /dev/null --write packages/typespec-azure-core/README.md "packages/typespec-azure-core/src/rules/${RULE_NAME}.md" website/src/content/docs/docs/libraries/azure-core/reference/linter.md "website/src/content/docs/docs/libraries/azure-core/rules/${RULE_NAME}.md"
pnpm exec prettier --ignore-path /dev/null --check packages/typespec-azure-core/README.md "packages/typespec-azure-core/src/rules/${RULE_NAME}.md" website/src/content/docs/docs/libraries/azure-core/reference/linter.md "website/src/content/docs/docs/libraries/azure-core/rules/${RULE_NAME}.md"
pnpm --filter @azure-tools/typespec-azure-rulesets build
pnpm --filter @azure-tools/typespec-azure-rulesets test
pnpm --filter @azure-tools/typespec-azure-core test
pnpm exec cross-env TYPESPEC_SKIP_WEBSITE_BUILD=true pnpm validate:pr
git diff --check
```

For TCGC promotion, use the same validation order with the exact package
`@azure-tools/typespec-client-generator-core` and its discovered rule test
filename. Run that package's build, lint, `regen-docs`, and tests, plus the
rulesets build/tests when registration changes. Do not mechanically substitute
`azure-core`: the package directory is `packages/typespec-client-generator-core`,
while the website library directory is
`website/src/content/docs/docs/libraries/typespec-client-generator-core`.
Derive the generated reference/rule files from its `regen-docs` configuration
and inspect/format those exact files with the same empty-ignore policy.

The Bash examples use the POSIX empty ignore path `/dev/null`. In Windows
PowerShell, use `NUL` instead. For ARM or core, set `$Library` to
`azure-resource-manager` or `azure-core` and `$RuleName` to the exact official
rule name:

```powershell
$Library = "azure-resource-manager"
$RuleName = "no-query-in-post"
$DocFiles = @(
  "packages\typespec-$Library\README.md"
  "packages\typespec-$Library\src\rules\$RuleName.md"
  "website\src\content\docs\docs\libraries\$Library\reference\linter.md"
  "website\src\content\docs\docs\libraries\$Library\rules\$RuleName.md"
)
pnpm exec prettier --ignore-path NUL --write @DocFiles
pnpm exec prettier --ignore-path NUL --check @DocFiles
```

For TCGC, use its exact package and website library paths rather than the
`typespec-$Library` convention:

```powershell
$RuleName = "replace-with-rule-name"
$DocFiles = @(
  "packages\typespec-client-generator-core\README.md"
  "packages\typespec-client-generator-core\src\rules\$RuleName.md"
  "website\src\content\docs\docs\libraries\typespec-client-generator-core\reference\linter.md"
  "website\src\content\docs\docs\libraries\typespec-client-generator-core\rules\$RuleName.md"
)
pnpm exec prettier --ignore-path NUL --write @DocFiles
pnpm exec prettier --ignore-path NUL --check @DocFiles
```

An explicit empty ignore file is also valid in place of the platform null path.
Apply this override only to these explicit filenames, never a directory, glob,
or repo-wide formatting command. Confirm the `--write` output actually lists all
four files, including `reference/linter.md` and `rules/<official-rule-name>.md`;
a successful `--check` summary alone does not prove ignored files were checked.
If needed, use `prettier --ignore-path <empty-ignore-path> --file-info <filename>`
for each generated file and confirm `"ignored": false`, then rerun the scoped
write/check commands.

Run a focused code review after steps 1-2 pass and before steps 3-6 when the
rule logic is non-trivial. This catches semantic gaps before expensive full
package validation.

Before PR creation, run the repo's pre-PR validation if available with the
website build skipped, but bound the wait and do not let it consume the rest of
the session after the required narrow validation has already passed:

```bash
pnpm exec cross-env TYPESPEC_SKIP_WEBSITE_BUILD=true pnpm validate:pr
```

#### Bounded broad-validation monitoring

Before launching the optional broad command, record its start time, a finite
overall deadline of at most 30 minutes, output artifact, and progress signal.
Preserve that deadline across tool waits and monitoring resumptions. Inspect
whether the wrapper streams or buffers child output; where supported, use a
child-output log or verbose/streaming option without changing validation scope.
Keep long-running output separate from the shared execution log.

Apply the five-minute inactivity limit only to an observable child-progress
signal, such as streamed build output or a build step/artifact advancing.
Wrapper stdout silence alone is insufficient when child output is buffered.
A live PID or unchanged process status alone is also not evidence of progress.
If no reliable child-progress signal is available, record that limitation and
use the original overall deadline rather than diagnosing a build stall from
wrapper silence. Do not change repository tooling just to add monitoring.

At five minutes of observed child inactivity or the overall deadline, stop the
specific command's process tree and verify quiescence. Include a **Validation
blocker** section in the PR with the last observable step, signal source,
elapsed time, termination reason, and successful required narrow validations.
Distinguish a monitoring/deadline limitation from an established code or
environmental failure; never invent a natural exit code for a terminated process.
Do not rerun the broad command automatically or waive a failed required check.

#### Validation findings

If validation reveals a semantic issue, do not edit the lintdiff source during
promotion. For every review or validation finding, classify it before editing:

- **source semantic issue**: promotion is blocked; by default, report the exact
  gap without asking or reopening repair. If the user requested confirmation,
  ask whether they want to reopen lintdiff repair; source changes still require
  explicit authorization. In queue-controlled mode, return
  `source-repair-required` to the outer queue under the handoff contract
- **promotion adaptation issue**: fix only the promotion worktree, and document
  why lintdiff does not need the change
- **pre-existing or environmental issue**: record the evidence and do not change
  unrelated code

Do not run the lintdiff migration harness during promotion. Harness validation
belongs to the lintdiff development or repair workflow before promotion.

### 10. Review, commit, push, and create a draft PR

Before committing or creating the PR, request a focused code review of the
promotion diff. The review should inspect:

- rule semantics and diagnostic targets
- TypeSpec linter naming convention compliance for the official rule name
- target-library dependency direction
- compliance with the linked native implementation boundary, including reachable
  helpers and reference-string inference through allowed Azure library APIs
- use of structured metadata where available, explicit handling of returned
  resolution diagnostics, and regression evidence for reference-format
  independence and preserved version-selection, fallback, and diagnostic targets
- test conversion fidelity from lintdiff fixtures
- docs accuracy, including front matter, full-name block, TypeSpec/SDK-focused
  rationale, and any Swagger/LintDiff provenance being confined to a provenance
  section
- generated docs and formatting drift, especially after rule renames:
  `packages/<target>/README.md`,
  `website/src/content/docs/docs/libraries/<library>/reference/linter.md`, and
  any generated rule page links must reflect the official rule name and pass
  Prettier
- ruleset registration, including that every newly promoted rule is `false`
  unless the user explicitly approved immediate enablement
- changelog classification and wording match the actual ruleset enablement:
  disabled-only registration has a separate `internal` rulesets entry, uses the
  official TypeSpec rule name, and says "Register ... as disabled," not "Enable"
- absence of generated lintdiff corpus artifacts

Commit only the promotion-worktree changes needed for the native-library PR.
Push the promotion branch to canonical `Azure/typespec-azure` using the
preflight's verified explicit remote/refspec. The source branch, not just the
PR's base, must be in that repository. Create a draft PR against
`Azure/typespec-azure:main` using the
required publication tool from the verified owner. A rejected push is a blocker,
not permission to change head repositories. Apply the shared
[publication checks and duplicate-safe recovery](../do-linter-development-task-one-by-one/app-session-execution.md#publication-recovery);
verify actual base/head repository, branch, SHA, draft status and full file scope
before reporting success. The single evidenced creation-configuration correction
is separate from draft/source-repair/review budgets, never a workflow restart.

In queue-controlled resumption, update the recorded open draft PR after pushing
incremental commits; do not create a duplicate. Verify the current remote head
still matches the handoff before pushing and stop on external changes.

Use this stable PR title pattern:

- `[Swagger Linter Migration] <ValidatorRuleId> -> <OfficialTypeSpecRuleName>`

Replace `<ValidatorRuleId>` with the original Swagger validator rule ID and
`<OfficialTypeSpecRuleName>` with the destination rule's actual unqualified
`createRule({ name })` value, not the canonical validator slug or the source
lintdiff rule name. For example:
`[Swagger Linter Migration] XmsResourceInPutResponse -> use-resource-model-for-put`.
Keep both names in the title even when the PR body already explains the mapping;
this preserves migration traceability in future Git history. See the
[review suggestion on PR #5503](https://github.com/Azure/typespec-azure/pull/5503#discussion_r4046613960).
Do not append environment or execution labels such as `devbox` or `heavy`.
Before publication, confirm the title's destination name matches the final
implementation, including any rename made during promotion or review. Preserve
an existing OPEN task PR's recorded title unless a correction is part of the
request; this convention alone does not authorize renaming existing PRs.

Write the PR description as an engineering explanation, not only a change list.
It must include:

- **Original Swagger linter:** include both of these direct GitHub hyperlinks
  before listing a checklist of every specific check the original rule performs:
  - `linter code: [<ValidatorRuleId>](<validator source URL>)`
  - `linter doc: [<validator-doc-file>.md](<validator documentation URL>)`

  Use the rule name and links from the fixture `rule.md` or validator repository.
  Do not omit either link or replace them with unlinked paths.

- **How the Swagger linter works:** explain the Swagger objects it inspects,
  traversal or lookup strategy, conditions and exemptions, diagnostic locations,
  and any known validator defects, stale maps, emitted-occurrence duplication, or
  other discrepancies that should not be copied.
- **Source TypeSpec lintdiff rule:** identify the source lintdiff rule id, local
  rule name, canonical validator rule slug, source branch, pinned source commit,
  source worktree path,
  and whether the source worktree had uncommitted rule changes. Link only to the
  original lintdiff source rule file. Use a branch-based GitHub URL, not a
  commit-SHA URL, and verify that the recorded source head repository is
  `Azure/typespec-azure` before constructing the link. A legacy fork source
  requires explicit user-authorized migration; do not invent a canonical URL
  for a branch that exists only in a fork. State that the source rule was assumed done for this run and
  was not modified during promotion; do not claim explicit user confirmation
  of done status unless it was actually given.
- **Destination analysis:** explain the selected official package, plausible
  alternatives, and the evidence from imports, rule semantics, fixture metadata,
  catalog/report data, and target-library dependency direction.
- **How the promoted TypeSpec linter works:** describe the target package rule
  implementation, semantic targets inspected, important compiler or library APIs
  used, version/projection handling, diagnostic targeting and deduplication
  decisions, and any intentional adaptation from the lintdiff source.
- **Fixture-to-native test mapping:** provide an explicit table that maps each
  relevant original lintdiff fixture to the exact native `vitest` test title or
  titles that cover it, including compliant cases and any review-regression
  tests. Link each fixture name to its original `main.tsp` with a branch-based
  GitHub URL in the recorded source repository, and write the native title exactly as it appears in the promoted
  test file, including the full `it("...")` string. If one fixture maps to
  multiple native tests, include one row per test title; if one native test
  combines multiple fixtures or semantic branches, include each fixture/branch in
  separate rows with the same exact test title. For new regression tests without
  an original fixture, use `N/A (review regression)` or a similarly explicit
  source value. Use this shape:
  `| Original lintdiff fixture | Native vitest case | Coverage note |`. Do not
  paraphrase native test titles, and do not claim copied snapshot parity when
  snapshots were not copied.
- **Migration evidence:** link directly to the rule's `migration.md` for the
  declared focused tests, real-service project comparison, latest full-corpus
  counts, one-sided project explanations, compile failures, and remaining
  uncertainty. Do not duplicate the detailed migration table or corpus
  declaration in the PR description when `migration.md` already contains it.
- **Validation blocker:** include this section only when required native
  promotion validation is blocked or incomplete. Do not mention skipped lintdiff
  harness validation as a blocker; the harness is not part of promotion.
- **Promotion sync policy:** semantic gaps found after promotion should block the
  promotion PR until the user explicitly reopens lintdiff repair, or the owning
  queue starts an authorized source-repair cycle. In queue mode, describe the
  bounded return-to-development flow and refresh this PR only after clean source
  review. Never describe source-rule edits as part of promotion itself.

Prefer concrete examples, project names, and before/after evidence. Avoid a
generic bullet such as "promote lint rule" without explaining the actual rule
behavior and why the destination package is correct.

After the draft PR exists, apply the `int:azure-specs` label directly by default
when the new rule could affect existing Azure service specs and permissions allow
it; otherwise report the labeling limitation. Ask before applying it only when
the user requested confirmation.

## Deliverable

Produce:

- the destination analysis and target package selected by the agent under the
  default "do not ask" policy or explicitly selected by the user
- a clean worktree branch, named from the canonical validator rule slug,
  containing only native-library promotion changes
- the absolute promotion worktree path, including on an early stop if selected
- source, tests, docs, rulesets, and change entries in the target packages
- validation evidence
- a created or updated draft PR link and verified pushed head SHA
- any sync notes for the corresponding lintdiff source PR
- in queue mode, the pinned source SHA, required-validation outcome, and complete
  cycle handoff for `source-repair-required` or any other blocker

## Post-run process review

After the promotion PR is created and the deliverable is complete, briefly
review the run before the final user response. Read and follow the
[shared post-run process review](../shared/post-run-process-review.md), including
its confidence gate, ownership, independent PR, and reporting rules. Focus on:

- steps that cost unexpected time and how to avoid or parallelize them next time
- commands that were too broad, stalled, or failed for environmental reasons
- narrower build, lint, test, docs, or PR-validation commands that proved
  sufficient
- setup shortcuts that are safe to reuse, such as prepared worktrees, initialized
  submodules, installed dependencies, or already-built package dependency
  closures
- test-conversion patterns that made fixture coverage easier or more reliable
- skill instructions that should be updated based on the observed run
