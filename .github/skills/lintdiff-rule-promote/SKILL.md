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
- Create and push the promotion PR's source branch in the canonical
  `Azure/typespec-azure` repository through the `origin` remote, not in a
  personal fork. Verify that `origin` points to `Azure/typespec-azure` before
  creating the worktree. If `origin` is not writable, stop and report the
  permission blocker; do not silently fall back to a fork.
- Treat the user-marked done lintdiff rule as immutable during promotion. Do not
  change `packages/typespec-lintdiff` source, fixtures, snapshots, package
  manifests, or docs unless the user explicitly redirects from promotion back to
  rule repair.
- Use the exact Swagger validator rule ID as the stable naming source for any
  lintdiff source branch, specs worktree, typespec-azure worktree, and promotion
  worktree that this workflow creates or reuses. Convert that ID to kebab-case
  and keep all words, for example `LatestVersionOfCommonTypesMustBeUsed` becomes
  `latest-version-of-common-types-must-be-used`.
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

## Fast path for repeat promotions

After the first promotion in a repo, use this optimized order unless the rule
needs special investigation:

1. Run the destination analysis and user confirmation before creating or
   preparing a worktree.
2. Read checked-in source evidence from the existing source worktree or fetched
   git refs; prefer source branches and worktrees whose names use the canonical
   Swagger validator rule slug. Do not create a source worktree just to inspect
   files that can be read with `git show <ref>:<path>`.
3. Reuse a clean, already-prepared promotion worktree pattern when available:
   submodules initialized, `mise trust` completed, and dependencies already
   installed. If the worktree is new, perform those setup steps immediately after
   creation and before code edits.
4. For a new promotion worktree, install JS dependencies without unrelated
   package lifecycle scripts first: `pnpm install --ignore-scripts`. Run a full
   `pnpm install` only when the target validation actually needs lifecycle
   outputs.
5. Do not run the lintdiff harness during promotion. The done rule's
   `migration.md` is the source of migration evidence; use source package build
   plus native target tests for promotion validation.
6. Convert fixture coverage with the standard mapping in step 5 instead of
   copying snapshots or recreating the full harness layout.
7. In a fresh worktree, build the target package dependency closure once before
   running `vitest` directly; otherwise tests may fail only because workspace
   packages such as `@typespec/compiler` have no `dist` output yet.
8. Run a focused review after the native rule and tests compile, before broad
   package validation. If the review finds a source-semantic issue, stop and
   report that promotion is blocked by a source-rule gap; do not repair the
   lintdiff source as part of promotion.
9. Validate in this order: one-time target-package dependency-closure build if
   needed, focused rule test, affected package build/lint, required target-package
   `regen-docs`, inspection and formatting of the generated package README and
   website linter/rule references, rulesets build/test, affected package test.
   Do not build the website or its dependency closure locally.
10. For broad local validation, set `TYPESPEC_SKIP_WEBSITE_BUILD=true` when
    running the repo build or `pnpm validate:pr`. Keep a bounded wait; if
    validation makes no progress for five minutes after an already-passed narrow
    validation set, stop it, classify it as an environmental/pre-existing
    validation blocker, and include the evidence in the PR instead of waiting
    indefinitely. Rely on CI's dedicated Website job for the authoritative Astro
    check and build.

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
   done rule's checked-in migration evidence.
4. Record the lintdiff source branch, commit, and source location in your notes.
   Prefer one of these source-location forms:
   - existing worktree path, when a matching local worktree is already present
     and its directory name uses the canonical validator rule slug, for example
     `C:\dev\worktrees\lintdiff-<validator-rule-slug>`
   - fetched ref name plus commit, when reading checked-in source with
     `git show <ref>:<path>`; prefer refs whose suffix is
     `lintdiff-<validator-rule-slug>`
   - newly created source worktree path, only when uncommitted local source
     changes are intentionally part of the source of truth or the user
     explicitly asks for a local source branch. Name the source branch
     `feature/lintdiff-<validator-rule-slug>` unless the repo or user supplies a
     different prefix, and name the source worktree
     `C:\dev\worktrees\lintdiff-<validator-rule-slug>`.
5. If there are uncommitted source-rule changes, treat the current working tree
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
- Identify applicability guards that exist only because the lintdiff package
  enables ARM and data-plane rules together. Record whether the destination
  package and official ruleset already provide the same applicability boundary,
  and compare neighboring destination rules before deciding whether the guard
  belongs in the promoted implementation.

The recommendation should include:

- suggested package
- alternative package, if plausible
- evidence from imports, rule semantics, fixture metadata, and report ruleset
- any required adaptation, such as removing lintdiff-only helpers or changing
  diagnostic names

Stop until the user selects the destination.

### 3. Create a clean promotion worktree

1. Keep the current lintdiff worktree untouched.
2. Verify that `origin` points to the canonical `Azure/typespec-azure`
   repository, then fetch `origin/main`. Do not use a personal-fork remote for
   either the base or the eventual PR source branch.
3. Create a new worktree and dedicated branch from `origin/main`. Use the
   canonical validator rule slug in both the branch and worktree directory name
   so the promotion source can be linked and the worktree can be reused later,
   for example:
   - `promote-lintdiff-<validator-rule-slug>`
   - `promote-<validator-rule-slug>-to-core`
   - `promote-<validator-rule-slug>-to-arm`
     A matching worktree directory should use the same slug, for example
     `C:\dev\worktrees\promote-lintdiff-<validator-rule-slug>`.
4. Initialize repository prerequisites in the new worktree before installing or
   validating:
   - run `git submodule update --init` so the `core/` workspace packages such
     as `@typespec/compiler` are present
   - run `mise trust` and use `mise exec --` for `pnpm` commands when mise is
     available
   - if dependencies are not installed, first run
     `mise exec -- pnpm install --ignore-scripts` to avoid unrelated workspace
     lifecycle setup such as Python package preparation; run full
     `mise exec -- pnpm install` only if a later target validation proves those
     scripts are required
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
- evaluate lintdiff-only applicability guards instead of copying or removing
  them mechanically:
  - remove a guard when it exists only to isolate an ARM-only rule from
    data-plane programs (or the reverse) in lintdiff's combined rulesets, and
    the selected official package and ruleset already guarantee that boundary
  - preserve a guard when the rule must still distinguish applicable and
    inapplicable services, namespaces, or declarations within the destination
    ruleset, or when provider metadata is part of the rule's semantics
  - use neighboring destination rules and ruleset registration as evidence,
    document the deliberate adaptation in the PR, and add a native test that
    would fail if the destination unnecessarily retained the lintdiff-only
    guard
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
layout.

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

Run or plan to run the rulesets build and test after updating the lists.

### 8. Add a Chronus change

Add a change entry for every touched official package:

- `@azure-tools/typespec-azure-core` or
  `@azure-tools/typespec-azure-resource-manager`
- `@azure-tools/typespec-azure-rulesets` when its rulesets changed

Use `feature` for a new official rule and `fix` when folding the behavior into
an existing official rule.

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
   README, rule documentation, and website linter/rule references
7. `@azure-tools/typespec-azure-rulesets` build and test when rulesets changed
8. affected package test
9. if broad local validation is warranted, run the repo build or
   `pnpm validate:pr` with `TYPESPEC_SKIP_WEBSITE_BUILD=true`

Do not manually build the website package or its dependency closure during local
promotion validation. The website build script honors
`TYPESPEC_SKIP_WEBSITE_BUILD=true`, matching the general CI build jobs. CI's
dedicated Website job runs without the skip and is the authoritative Astro check
and build for generated website content.

For ARM rule promotion, use this command set as the default targeted validation
loop, replacing `<rule-name>` with the promoted rule file stem:

```bash
RULE_NAME="replace-with-rule-name"
pnpm -r --filter "@azure-tools/typespec-azure-resource-manager..." build
pnpm --filter @azure-tools/typespec-azure-resource-manager exec vitest run "test/rules/${RULE_NAME}.test.ts"
pnpm --filter @azure-tools/typespec-azure-resource-manager build
pnpm --filter @azure-tools/typespec-azure-resource-manager lint
pnpm --filter @azure-tools/typespec-azure-resource-manager regen-docs
pnpm exec prettier --write packages/typespec-azure-resource-manager/README.md "packages/typespec-azure-resource-manager/src/rules/${RULE_NAME}.md" website/src/content/docs/docs/libraries/azure-resource-manager/reference/linter.md
pnpm exec prettier --check packages/typespec-azure-resource-manager/README.md "packages/typespec-azure-resource-manager/src/rules/${RULE_NAME}.md" website/src/content/docs/docs/libraries/azure-resource-manager/reference/linter.md
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
pnpm exec prettier --write packages/typespec-azure-core/README.md "packages/typespec-azure-core/src/rules/${RULE_NAME}.md" website/src/content/docs/docs/libraries/azure-core/reference/linter.md
pnpm exec prettier --check packages/typespec-azure-core/README.md "packages/typespec-azure-core/src/rules/${RULE_NAME}.md" website/src/content/docs/docs/libraries/azure-core/reference/linter.md
pnpm --filter @azure-tools/typespec-azure-rulesets build
pnpm --filter @azure-tools/typespec-azure-rulesets test
pnpm --filter @azure-tools/typespec-azure-core test
pnpm exec cross-env TYPESPEC_SKIP_WEBSITE_BUILD=true pnpm validate:pr
git diff --check
```

Run a focused code review after steps 1-2 pass and before steps 3-6 when the
rule logic is non-trivial. This catches semantic gaps before expensive full
package validation.

Before PR creation, run the repo's pre-PR validation if available with the
website build skipped, but bound the wait and do not let it consume the rest of
the session after the required narrow validation has already passed:

```bash
pnpm exec cross-env TYPESPEC_SKIP_WEBSITE_BUILD=true pnpm validate:pr
```

If `validate:pr` stalls with no new output for five minutes, stop it and
include a **Validation blocker** section in the PR body with the last observed
step, elapsed time, and the successful narrower validations.

If validation reveals a semantic issue, do not edit the lintdiff source during
promotion. For every review or validation finding, classify it before editing:

- **source semantic issue**: promotion is blocked; report the exact gap and ask
  the user to reopen lintdiff repair if they want source changes
- **promotion adaptation issue**: fix only the promotion worktree, and document
  why lintdiff does not need the change
- **pre-existing or environmental issue**: record the evidence and do not change
  unrelated code

Do not run the lintdiff migration harness during promotion. Harness validation
belongs to the lintdiff development or repair workflow before the user marks the
rule done.

### 10. Review, commit, push, and create a draft PR

Before committing or creating the PR, request a focused code review of the
promotion diff. The review should inspect:

- rule semantics and diagnostic targets
- TypeSpec linter naming convention compliance for the official rule name
- target-library dependency direction
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
- absence of generated lintdiff corpus artifacts

Commit only the promotion-worktree changes needed for the native-library PR.
Push the promotion branch to `origin` (for example,
`git push --set-upstream origin HEAD`) and create a same-repository draft PR
whose head branch and `main` base both belong to `Azure/typespec-azure`. If the
push is rejected, stop and report the permission blocker; do not push the branch
to a personal fork instead.

Use this stable PR title pattern:

- `[Swagger Linter Migration] <ValidatorRuleId>`

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
  rule name, canonical validator rule slug, source branch, source worktree path,
  and whether the source worktree had uncommitted rule changes. Link only to the
  original lintdiff source rule file. Use a branch-based GitHub URL, not a
  commit-SHA URL. State that the user-marked done source rule was not modified
  during promotion.
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
  GitHub URL, and write the native title exactly as it appears in the promoted
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
  promotion PR until the user explicitly reopens lintdiff repair; do not describe
  unapproved source-rule edits as part of the promotion flow.

Prefer concrete examples, project names, and before/after evidence. Avoid a
generic bullet such as "promote lint rule" without explaining the actual rule
behavior and why the destination package is correct.

After the draft PR exists, apply or ask for the `int:azure-specs` label when the
new rule could affect existing Azure service specs.

## Deliverable

Produce:

- the destination analysis and user-selected target package
- a clean worktree branch, named from the canonical validator rule slug,
  containing only native-library promotion changes
- source, tests, docs, rulesets, and change entries in the target packages
- validation evidence
- a draft PR link
- any sync notes for the corresponding lintdiff source PR

## Post-run process review

After the promotion PR is created and the deliverable is complete, briefly
review the run before the final user response. Capture concrete suggestions for
the next promotion, especially:

- steps that cost unexpected time and how to avoid or parallelize them next time
- commands that were too broad, stalled, or failed for environmental reasons
- narrower build, lint, test, docs, or PR-validation commands that proved
  sufficient
- setup shortcuts that are safe to reuse, such as prepared worktrees, initialized
  submodules, installed dependencies, or already-built package dependency
  closures
- test-conversion patterns that made fixture coverage easier or more reliable
- skill instructions that should be updated based on the observed run

Print the suggestions in the final handoff and ask the user whether any should
be adopted into this skill. Do not update the skill automatically from the
post-run review; only make skill changes after the user explicitly approves the
specific suggestion(s).
