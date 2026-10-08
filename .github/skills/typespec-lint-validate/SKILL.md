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

## Rule-test responsibility boundary

Keep native rule unit tests focused on the rule's predicate, supported target
kinds, and diagnostic contract. Do not re-test behavior owned by the compiler,
linter framework, or shared test harness in every rule suite.

- Do not add tests solely to prove imported-library exclusion, suppression or
  rule enablement, alias/source identity, traversal of nested namespaces,
  uninstantiated-template filtering, or ordinary inheritance/spread behavior
  supplied by the framework.
- Use those authoring forms only when they exercise a distinct decision made by
  the rule, such as a custom applicability guard, inherited-property lookup,
  recursive traversal, name resolution, or diagnostic deduplication. Identify
  the rule-owned branch or regression the case proves; a framework guarantee
  mentioned in the contract is not sufficient justification.
- Prefer minimal compliant and violating snippets for each meaningful predicate
  branch and supported target kind. Assert rule-owned messages, counts, and
  authored locations without asserting compiler object identity or traversal
  internals.
- When updating an existing suite, remove framework-only cases within the task's
  scope; retain any distinct rule assertion in a simpler case. If a genuine
  framework regression needs coverage, place it in the owning framework/helper
  suite rather than duplicating it across rules. Do not edit unrelated PRs unless
  that cleanup is explicitly part of the task.
- Keep migration fixtures and corpus comparisons that explain Swagger/TypeSpec
  differences in the migration harness. They do not automatically become native
  rule unit tests; record why a framework-only fixture is not ported.

For example, a summary/documentation equality rule needs equality, inequality,
missing-value, normalization, and supported-declaration cases. A fake imported
package proving that the linter filters library declarations adds no coverage of
that predicate. A rule that implements its own service guard does need included
and excluded service cases.

This boundary incorporates the
[review feedback on #5507](https://github.com/Azure/typespec-azure/pull/5507#discussion_r4093555025).

## Contract-driven coverage

Map each rule-owned decision in the
[native rule contract](../typespec-lint-discovery/SKILL.md#native-rule-contract)
to a concrete test, applying the [responsibility boundary](#rule-test-responsibility-boundary)
first. The dimensions below are not an unconditional test matrix for every rule:

- Prove ordinary compliant authoring and a realistic violating customization.
  Follow the [example authoring policy](../typespec-lint-implement/SKILL.md#example-authoring)
  for documentation and representative scenarios: use standard ARM templates,
  named customization arguments, and omitted defaults for ARM resource cases.
  Retain minimal handwritten semantic tests when they isolate a rule-owned
  decision involving unions, intersections, metadata, diagnostic targets, or
  applicability. Do not rewrite them all as ARM scenarios or add ARM dependencies
  to a shared Core test setup solely to satisfy documentation guidance. The
  responsibility boundary still excludes framework-only template-filtering tests.
- Assert the exact diagnostic set and authored targets where supported: multiple
  offending properties, shared/inherited declarations, missing-member fallback,
  and no redundant aggregate warning when property findings already cover it.
  Equal Swagger totals are not a substitute for this native diagnostic contract.
- Test custom applicability decisions implemented by the rule, not standard
  framework filtering or enablement. Pair rule-owned exclusion cases with an
  included violation so the custom guard cannot pass by checking nothing.
- For SDK-name policies, test overrides in both directions: a common override
  that fixes a source name and one that makes it invalid. Cover language-scoped
  overrides, aliases/inheritance, fallback naming, and independence from emitted
  operation IDs according to the contract. Keep emitter-specific comparison
  fixtures separate when native tests must not import an emitter.
- Exercise every added resolver/special case with supported authoring. Preserve
  rejection or comparison evidence for intentional migration gaps without
  expanding the production contract to unsupported inputs.
- Before removing a case, check for distinct rule-owned assertions to retain;
  framework-only cases need no replacement in the rule suite. Template tests
  asserting only custom-query diagnostics, for example, can also prove standard
  parameters are not reported by the rule.

### Documentation example validation

Validate the actual incorrect/correct snippets through the repository's existing
example or focused test workflow, adding only the imports and service/resource
setup needed to compile them. Record that setup so the result is reproducible;
do not replace the published operation or response shape with an easier test.

- Explicitly enable the target rule, including when its ruleset entry defaults
  to disabled. Require both snippets to compile without unrelated errors.
- Assert the intended target-rule diagnostic set for the incorrect snippet,
  including its authored target where supported, and no target-rule diagnostics
  for the corrected snippet. Compilation alone does not prove either result.
- Check that template defaults or customizations have not erased the violation
  or made the correction pass only through an exemption. For implicit response
  examples, preserve implicit payloads rather than switching to explicit
  `@body` or `@bodyRoot` bodies outside the rule's scope.
- Record the example audience, chosen template/customization or justified
  handwritten exception, and diagnostic evidence in the validation handoff or
  PR notes. Reuse existing example infrastructure or a scratch workflow instead
  of forcing ARM dependencies into a Core unit-test suite. If no suitable
  workflow is available, report the missing evidence rather than claiming this
  gate passed; do not add a new general-purpose harness just for the examples.

Review user-facing rule docs against the
[native rule documentation contract](../typespec-lint-implement/SKILL.md#native-rule-documentation).
Read the main explanation and examples without the migration section and verify
that they teach the native requirement without legacy validator or
emitted-reference comparisons. Apply the same check to regenerated public pages;
compiling examples alone does not prove the documentation meets this contract.

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
