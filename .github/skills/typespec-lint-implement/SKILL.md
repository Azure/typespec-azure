---
name: typespec-lint-implement
description: Implement or modify a TypeSpec lint rule once the semantics are clear. Use this when you already have a rule brief or otherwise know the intended behavior and want correct, idiomatic code changes in the target lint package.
argument-hint: "[rule brief, target package, or implementation task]"
user-invocable: true
---

# TypeSpec lint implementation

Use this skill when the next step is **editing lint code**.

## Use this skill for

- adding a new TypeSpec lint rule
- modifying an existing rule's logic or diagnostics
- wiring a rule into the package's registration surface
- making focused implementation changes that follow the repository's lint conventions

If the semantics are still fuzzy, use `/typespec-lint-discovery` first.

## Process

1. Inspect the target lint package before editing:
   - entrypoints and exports
   - rule registration and rulesets
   - helper patterns
   - diagnostics style and phrasing
   - build and test expectations
2. Implement the smallest correct design that fully satisfies the current rule brief.
3. Reuse existing helpers and conventions before creating new abstractions.
4. Keep diagnostics explicit, actionable, and consistent with the surrounding package.
5. Identify the minimum validation coverage that should exist after the implementation lands.
6. Hand off to `/typespec-lint-validate` with a clear statement of what should now be proven.

## Deliverable

Produce:

- the implementation or modification
- any rule wiring or registration changes
- concise notes on important design choices
- the exact validation/testing follow-up that should run next

## Portability rules

- Do not assume the target repository uses this repo's `linter/` or `scratch/` layout.
- Discover the local package structure and adapt to it.
- Use repository-native commands, test frameworks, and file organization once discovered.

## Example invocations

- `/typespec-lint-implement implement the rule from the brief above in the local lint package`
- `/typespec-lint-implement modify the existing rule so boolean properties are ignored when they already have an enum metadata helper`
