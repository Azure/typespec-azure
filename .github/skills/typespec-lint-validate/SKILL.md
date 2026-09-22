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

## Contract-driven coverage

Map each relevant decision in the
[native rule contract](../typespec-lint-discovery/SKILL.md#native-rule-contract)
to a concrete test. Apply the following dimensions when the rule exercises them,
not as an unconditional test matrix for every rule:

- Prove ordinary compliant authoring and a realistic violating customization.
  In template-based libraries such as ARM, use standard operation templates for
  representative examples/tests. Use named customization arguments and omit
  defaults. Keep handcrafted cases when they specifically prove a non-resource,
  nonstandard, or applicability boundary.
- Assert the exact diagnostic set and authored targets where supported: multiple
  offending properties, shared/inherited declarations, missing-member fallback,
  and no redundant aggregate warning when property findings already cover it.
  Equal Swagger totals are not a substitute for this native diagnostic contract.
- Test the intended applicability boundary: direct enablement, nested namespaces,
  unrelated services, and imported declarations when relevant. Pair exclusion
  cases with an included violation so filtering cannot pass by checking nothing.
- For SDK-name policies, test overrides in both directions: a common override
  that fixes a source name and one that makes it invalid. Cover language-scoped
  overrides, aliases/inheritance, fallback naming, and independence from emitted
  operation IDs according to the contract. Keep emitter-specific comparison
  fixtures separate when native tests must not import an emitter.
- Exercise every added resolver/special case with supported authoring. Preserve
  rejection or comparison evidence for intentional migration gaps without
  expanding the production contract to unsupported inputs.
- Remove a redundant test only after identifying the retained assertion that
  proves its behavior. Template tests asserting only custom-query diagnostics,
  for example, can also prove standard parameters are not reported.

Compile documentation examples through the repository's existing example or
test workflow when available. A plausible-looking template snippet is not
evidence that the recommended customization works.

## Deliverable

Produce:

- test additions or updates
- the focused validation commands that were run
- the resulting evidence
- contract-to-test coverage, with any unproven relevant dimensions stated
- any small corrective edits made during validation
- the next action if the rule still does not meet expectations

## Portability rules

- Discover the repository's validation loop rather than assuming one.
- Treat scratch projects, sample specs, and snapshot harnesses as repository-specific implementations of the same broader testing need.
- Keep the loop focused; do not default to a full repo test run unless the narrower evidence is not enough.

## Example invocations

- `/typespec-lint-validate add violation and compliance tests for the new rule and run the narrowest useful validation loop`
- `/typespec-lint-validate validate the rule in scratch first, then update package-native tests`
