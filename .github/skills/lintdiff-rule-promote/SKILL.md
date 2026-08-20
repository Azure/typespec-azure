---
name: lintdiff-rule-promote
description: Promote a user-marked done LintDiff rule from packages/typespec-lintdiff into the correct official TypeSpec Azure library, with a clean worktree, user-confirmed destination, native tests/docs/ruleset wiring, validation, and a draft PR. Use when the user names a migrated lintdiff rule as done and asks to move or promote it to typespec-azure-core or typespec-azure-resource-manager.
argument-hint: "[validator rule id or local rule name marked done]"
user-invocable: true
---

# LintDiff rule promotion

Use this skill when a migrated rule in `packages/typespec-lintdiff` is ready to be
promoted into an official TypeSpec Azure library.

Promotion is a handoff workflow, not a rule-design workflow. The rule's source
PR in `packages/typespec-lintdiff` remains the source of truth while the
official-library PR is prepared in a clean worktree.

## Preconditions

- The user must explicitly name the rule and mark it as done for this run.
  Do not infer "done" from catalog status, `coverageKind`, fixture counts, or
  local linter registration alone.
- In an active promotion conversation, wording like "start with
  `<RuleName>`" or "promote `<RuleName>`" is sufficient only when the user has
  already established that this workflow is for done rules. Record that as a
  per-run eligibility decision; do not write it back as persistent metadata.
- If the rule semantics are still under review, stop and send the user to the
  lintdiff development or repair flow first.
- Do not edit or clean up the current lintdiff worktree as part of promotion.
  The promotion PR must be created from a separate worktree.
- Treat the user-marked done lintdiff rule as immutable during promotion. Do not
  change `packages/typespec-lintdiff` source, fixtures, snapshots, package
  manifests, or docs unless the user explicitly redirects from promotion back to
  rule repair.

## Fast path for repeat promotions

After the first promotion in a repo, use this optimized order unless the rule
needs special investigation:

1. Run the destination analysis and user confirmation before creating or
   preparing a worktree.
2. Reuse a clean, already-prepared promotion worktree pattern when available:
   submodules initialized, `mise trust` completed, and dependencies already
   installed. If the worktree is new, perform those setup steps immediately after
   creation and before code edits.
3. Check lintdiff harness prerequisites up front. If the external validator
   checkout is absent, do not spend time trying to update snapshots; record the
   blocker and use source package build plus native target tests for validation.
4. Convert fixture coverage with the standard mapping in step 5 instead of
   copying snapshots or recreating the full harness layout.
5. Run a focused review after the native rule and tests compile, before broad
   package validation. If the review finds a source-semantic issue, stop and
   report that promotion is blocked by a source-rule gap; do not repair the
   lintdiff source as part of promotion.
6. Validate in this order: focused rule test, affected package build/lint,
   docs regeneration, rulesets build/test, affected package test. Escalate to
   broader validation only when the touched surface or a failure requires it.

## Process

### 1. Identify the source rule

1. Resolve the user input to both:
   - the validator rule id, usually `test/fixtures/<ValidatorRuleId>/rule.md`
   - the local TypeSpec rule name, usually `src/rules/<rule-name>.ts`
2. Inspect the source rule and evidence:
   - `packages/typespec-lintdiff/src/rules/<rule-name>.ts`
   - `packages/typespec-lintdiff/src/linter.ts`
   - `packages/typespec-lintdiff/test/fixtures/<ValidatorRuleId>/rule.md`
   - relevant fixture cases under `test/fixtures/<ValidatorRuleId>/`
   - `packages/typespec-lintdiff/docs/validate-report.md`
   - `packages/typespec-lintdiff/catalog/catalog.json` and
     `catalog/validator-rule-metadata.json` when present
3. Before running the lintdiff harness, check whether
   `LINTDIFF_VALIDATOR_ROOT` or `test/azure-openapi-validator` is available.
   Missing harness inputs are an environment blocker, not a rule failure.
4. Record the lintdiff source branch, commit, and worktree path in your notes.
   If there are uncommitted source-rule changes, treat the current working tree
   as the source only after making that explicit in the PR description.

### 2. Recommend the destination library, then wait for the user's choice

Analyze first, then present a recommendation with reasons and ask the user to
choose the destination before moving files.

Use these signals:

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
  `@azure-tools/typespec-azure-core`, unless the implementation needs ARM-only
  helpers or ARM-specific semantics.
- `@azure-tools/typespec-azure-core` must not take a dependency on
  `@azure-tools/typespec-azure-resource-manager`. If a candidate core rule
  currently imports ARM helpers, either recommend ARM or explain the rewrite
  needed to make it core-safe.
- Use fixture front matter and validation-report ruleset inference as evidence,
  not as the sole authority.
- Check for existing official rules with equivalent coverage before promoting.
  If the official rule already exists, recommend updating that rule instead of
  adding a duplicate.

The recommendation should include:

- suggested package
- alternative package, if plausible
- evidence from imports, rule semantics, fixture metadata, and report ruleset
- any required adaptation, such as removing lintdiff-only helpers or changing
  diagnostic names

Stop until the user selects the destination.

### 3. Create a clean promotion worktree

1. Keep the current lintdiff worktree untouched.
2. Fetch the Azure main branch (`upstream/main` or `origin/main`, depending on
   local remotes).
3. Create a new worktree and dedicated branch from the Azure main branch, for
   example:
   - `promote-lintdiff-<rule-name>`
   - `promote-<rule-name>-to-core`
   - `promote-<rule-name>-to-arm`
4. Initialize repository prerequisites in the new worktree before installing or
   validating:
   - run `git submodule update --init` so the `core/` workspace packages such
     as `@typespec/compiler` are present
   - run `mise trust` and use `mise exec --` for `pnpm` commands when mise is
     available
   - prefer reusing an already-prepared clean promotion worktree only if it has
     no uncommitted or unrelated changes and is based on the requested main
     branch
5. Copy only the selected rule's implementation and evidence from the lintdiff
   source worktree into the promotion worktree.
6. Do not copy generated artifacts, `dist`, `temp`, validator snapshots,
   `specs/results`, full corpus output, or unrelated lintdiff harness files.

Keep both PRs aligned:

- The lintdiff PR remains the source of truth for rule behavior.
- If review on the native-library PR reveals that the done lintdiff rule has a
  semantic gap, stop promotion and report the blocker. The user must explicitly
  choose to reopen lintdiff rule repair before any source changes are made.
- Do not let the promoted rule diverge from the lintdiff source without
  explicitly documenting why.

### 4. Move and adapt source code

Place the rule in the selected package:

- `packages/typespec-azure-core/src/rules/<rule-name>.ts`, or
- `packages/typespec-azure-resource-manager/src/rules/<rule-name>.ts`

Then adapt it to the destination package:

- update imports to use destination-package helpers and relative paths
- reuse existing `src/rules/utils.ts` helpers before adding new helpers
- remove any dependency on `tsp-lintdiff-local-linter`
- update exported rule variable names to match neighboring rules
- preserve severity and diagnostic intent unless the target package convention
  or existing equivalent rule requires a better fit
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

Create:

- `packages/<target>/test/rules/<rule-name>.test.ts`

Use `createLinterRuleTester` and cover:

- every violating branch documented in `rule.md`
- representative compliant cases
- edge cases called out in source-of-truth notes
- regression cases for any lintdiff review fixes

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

Prefer direct TypeSpec snippets and expected diagnostics over OpenAPI output
snapshots. If a lintdiff fixture depends on unrelated diagnostics or
suppressions, adapt the snippet so the promoted rule is tested directly.

### 6. Move rule documentation

Create or update:

- `packages/<target>/src/rules/<rule-name>.md`

Use the lintdiff `rule.md` as source material, but rewrite it as official
library documentation:

- remove lintdiff front matter and harness-only notes
- explain what the rule checks and why
- include realistic TypeSpec incorrect and correct examples
- keep validator provenance only when it helps explain behavior

Regenerate docs for the affected library after the rule docs are in place.

### 7. Update rulesets

Update `packages/typespec-azure-rulesets` so all official rules remain
explicitly listed.

- ARM-specific rules go in `src/rulesets/resource-manager.ts`.
- Core rules that apply to data-plane and ARM go in both
  `src/rulesets/data-plane.ts` and `src/rulesets/resource-manager.ts`.
- Core rules that are not applicable to ARM, or conflict with an ARM-specific
  rule, must still be explicitly listed in `resource-manager.ts` with `false`
  and a short comment.

Run or plan to run the rulesets build and test after updating the lists.

### 8. Add a Chronus change

Add a change entry for every touched official package:

- `@azure-tools/typespec-azure-core` or
  `@azure-tools/typespec-azure-resource-manager`
- `@azure-tools/typespec-azure-rulesets` when its rulesets changed

Use `feature` for a new official rule and `fix` when folding the behavior into
an existing official rule.

### 9. Validate narrowly, then broadly enough for PR

Use the repo's mise-managed toolchain when available.

Optimized validation order:

1. affected rule test file
2. affected package build
3. affected package lint, if available
4. affected package `regen-docs`
5. `@azure-tools/typespec-azure-rulesets` build and test when rulesets changed
6. affected package test

Run a focused code review after steps 1-2 pass and before steps 3-6 when the
rule logic is non-trivial. This catches semantic gaps before expensive full
package validation.

Before PR creation, run the repo's pre-PR validation if available:

```bash
pnpm validate:pr
```

If validation reveals a semantic issue, do not edit the lintdiff source during
promotion. For every review or validation finding, classify it before editing:

- **source semantic issue**: promotion is blocked; report the exact gap and ask
  the user to reopen lintdiff repair if they want source changes
- **promotion adaptation issue**: fix only the promotion worktree, and document
  why lintdiff does not need the change
- **pre-existing or environmental issue**: record the evidence and do not change
  unrelated code

When validating `packages/typespec-lintdiff`, confirm the migration harness
inputs are present before assuming a rule failure:

- `LINTDIFF_VALIDATOR_ROOT` or `test/azure-openapi-validator` must point to an
  `azure-openapi-validator` source checkout; npm packages do not include the
  source files the harness reads for metadata
- `LINTDIFF_COMMON_TYPES` may also be required for corpus-style validation
- if those inputs are absent, run the package build and any native tests you can,
  then report the missing external input explicitly instead of fabricating
  snapshots

### 10. Review, commit, push, and create a draft PR

Before committing or creating the PR, request a focused code review of the
promotion diff. The review should inspect:

- rule semantics and diagnostic targets
- target-library dependency direction
- test conversion fidelity from lintdiff fixtures
- docs accuracy
- ruleset registration
- absence of generated lintdiff corpus artifacts

Commit only the promotion-worktree changes needed for the native-library PR.
Push the promotion branch to the user's fork and create a draft PR against
`Azure/typespec-azure` `main`.

The PR description should include:

- source lintdiff rule id and source branch/commit
- selected destination package and why it was chosen
- what changed during adaptation
- how fixture coverage was converted to native tests
- validation commands and results
- synchronization note: review-driven semantic fixes should land in the
  lintdiff PR first, then be synced into this native PR

After the draft PR exists, apply or ask for the `int:azure-specs` label when the
new rule could affect existing Azure service specs.

## Deliverable

Produce:

- the destination analysis and user-selected target package
- a clean worktree branch containing only native-library promotion changes
- source, tests, docs, rulesets, and change entries in the target packages
- validation evidence
- a draft PR link
- any sync notes for the corresponding lintdiff source PR
