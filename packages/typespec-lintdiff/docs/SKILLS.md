# Migration skills map

Six project skills (in `.github/skills/`) support the LintDiff / `azure-openapi-validator`
→ native TypeSpec migration. They split into two families: **LintDiff-specific** skills that are
migration-aware, and **generic, portable** TypeSpec-lint authoring skills that work in any lint
package.

**Rule of thumb:** start at the overseer. Classification comes first, code last — most validator
rules should resolve to _already covered / template-enforced / blocked_, not new code. The generic
discovery → implement → validate trio only fires for a genuine gap.

## Pipeline

```
                 ┌─────────────────────────────────────────────┐
                 │  /lintdiff-rule-migration-overseer          │  ← START HERE
                 │  (orchestrator: screen + classify + route)  │
                 └───────────────┬─────────────────────────────┘
                                 │ needs deep evidence on a named rule
                                 ▼
                 ┌─────────────────────────────────────────────┐
                 │  /lintdiff-rule-intake                      │
                 │  (gather source-of-truth + local evidence)  │
                 └───────────────┬─────────────────────────────┘
                                 │ classify → only if "true gap" / "partial"
                                 ▼
   ┌──────────────────────┐   ┌────────────────────────┐   ┌──────────────────────┐
   │ /typespec-lint-      │→ │ /typespec-lint-        │→ │ /typespec-lint-      │
   │ discovery (brief)    │   │ implement (code)       │   │ validate (tests)     │
   └──────────────────────┘   └────────────────────────┘   └──────────────────────┘

   Side path: /lintdiff-rule-reimport-repair  ← audit & fix an already-imported rule

   Handoff path after the user explicitly marks a rule done:
   /lintdiff-rule-promote  ← choose official library, clean worktree, draft native PR
```

## LintDiff-specific skills (migration-aware layer)

### `/lintdiff-rule-migration-overseer` — entry point / orchestrator

- Screen candidates ("what is safe to migrate now?") or drive one rule end-to-end.
- Classifies each rule into: _already covered · template-enforced · blocked/suppression-dependent ·
  partial · true gap · test-quality issue_.
- **Only true gaps or incomplete partials** route into the generic implement skills — this is the
  guardrail against inventing redundant lints.
- Companion: [`classification-guide.md`](../../../.github/skills/lintdiff-rule-migration-overseer/classification-guide.md).

### `/lintdiff-rule-intake` — deep evidence gathering for one named rule

- Use before touching code. Pulls upstream truth (validator docs, implementation, tests,
  registration metadata) **and** local evidence (`rule.md`, fixtures, stored validator + TypeSpec
  diagnostics, catalog/coverage reports).
- Flags **blocking evidence**: `#suppress` directives, prerequisite TypeSpec diagnostics,
  template-enforced behavior — signals the rule may already be covered.
- Output: a reusable intake summary. Companion:
  [`evidence-checklist.md`](../../../.github/skills/lintdiff-rule-intake/evidence-checklist.md).

### `/lintdiff-rule-reimport-repair` — audit & fix an existing import

- Use when a rule was **already migrated but looks wrong/incomplete**. One rule at a time.
- Rebuilds the upstream **semantic matrix** (violating / compliant / ignored / edge cases, plus
  doc-vs-implementation mismatches) and diffs it against the local migrated state to repair the
  rule, fixtures, tests, or classification.
- Companion: [`repair-checklist.md`](../../../.github/skills/lintdiff-rule-reimport-repair/repair-checklist.md).

### `/lintdiff-rule-promote` — move a done rule into an official library

- Use only after the user explicitly names a rule as **done** for this run.
- Analyzes the destination package first, recommends `typespec-azure-core` or
  `typespec-azure-resource-manager` with evidence, and waits for the user's choice.
- Creates a clean promotion worktree from `main`, copies/adapts the selected lintdiff rule into the
  official package, converts fixtures to native rule tests, updates docs/rulesets/change entries,
  validates, and opens a draft PR.
- Keeps the lintdiff PR as the source of truth: semantic review fixes should land there first, then
  be synced into the promotion PR.

## Generic portable skills (authoring layer)

Repo-agnostic — they work in any TypeSpec lint package (kept portable-first on purpose).

### `/typespec-lint-discovery` — produce an implementation-ready rule brief

- For the rule-definition stage. Confirms whether coverage already exists, finds prior art,
  identifies the compiler/decorator/metadata APIs to inspect, and defines intended semantics +
  false-positive risks. Emits a brief ready for implement.

### `/typespec-lint-implement` — write the rule code

- Once semantics are clear. Inspects the target package's registration surface, helpers, and
  diagnostics style; makes the smallest correct change and wires it into the ruleset. Hands off to
  validate.

### `/typespec-lint-validate` — prove behavior with tests

- Adds violation / compliance / regression coverage in the repo's preferred loop
  (`vitest` + `createLinterRuleTester`), runs the narrowest useful validation, and does small
  corrective fixes. Kicks back to discovery/implement if a larger redesign is needed.

## Notes for the handoff developer

- Default entry is **always the overseer** — don't jump straight to implementing a native lint.
- Classification is the point: expect most validator rules to end up _covered / template-enforced /
  blocked_, not new code.
- The generic trio is reusable beyond this migration — it's the standard TypeSpec lint authoring
  loop for any rule.
- Each LintDiff skill ships a companion checklist/guide (linked above) that keeps the pass grounded
  in source evidence and repository quirks.
