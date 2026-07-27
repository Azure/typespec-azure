---
name: typespec-lint-validate
description: Add or update tests for a TypeSpec lint and run the narrowest useful validation loop. Use this when a rule needs violation/compliance coverage, focused regression checks, or a small corrective iteration after validation exposes a behavior problem.
argument-hint: "[rule name, validation goal, or test task]"
user-invocable: true
---

# TypeSpec lint validation

Use this skill when the main task is to **prove lint behavior with concrete examples**.

## Use this skill for

- adding violation, compliance, and regression coverage
- validating a freshly implemented rule in the repository's preferred test loop
- using a sandbox or scratch spec for fast iteration before or alongside formal tests
- tightening a rule when validation shows it is too broad or too narrow

## Process

1. Inspect how the repository organizes lint tests, sample specs, snapshots, or scratch workflows.
2. Add the smallest useful set of cases that proves:
   - intended violations
   - intended compliant cases
   - important edge cases or regressions
3. Run the narrowest useful validation commands first.
4. If validation reveals a small implementation issue, fix it as part of this skill and rerun the focused loop.
5. If the rule needs a larger redesign, stop and hand back to `/typespec-lint-discovery` or `/typespec-lint-implement` with a precise explanation.
6. End with a concise statement of what is now proven, what still is not, and what command output supports that claim.

## Deliverable

Produce:

- test additions or updates
- the focused validation commands that were run
- the resulting evidence
- any small corrective edits made during validation
- the next action if the rule still does not meet expectations

## Portability rules

- Discover the repository's validation loop rather than assuming one.
- Treat scratch projects, sample specs, and snapshot harnesses as repository-specific implementations of the same broader testing need.
- Keep the loop focused; do not default to a full repo test run unless the narrower evidence is not enough.

## Example invocations

- `/typespec-lint-validate add violation and compliance tests for the new rule and run the narrowest useful validation loop`
- `/typespec-lint-validate validate the rule in scratch first, then update package-native tests`
