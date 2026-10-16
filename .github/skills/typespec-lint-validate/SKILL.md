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
2. Map acceptance claims through the [test-claim matrix](#test-claim-matrix),
   then add the smallest useful set of cases that proves:
   - intended violations
   - intended compliant cases
   - important edge cases or regressions
3. Run the narrowest useful validation commands first.
4. If validation reveals a small implementation issue, fix it as part of this skill and rerun the focused loop.
5. If the rule needs a larger redesign, stop and hand back to `/typespec-lint-discovery` or `/typespec-lint-implement` with a precise explanation.
6. End with a concise statement of what is now proven, what still is not, and what command output supports that claim.

## Test-claim matrix

Before adding or converting tests, record each required acceptance claim, its
test layer, harness, and exact test title or evidence location in the existing
brief, fixture mapping, migration note, or PR notes. Include promises made in
the PR description, not only the rule's predicate branches.

| Claim                                                                               | Layer                        | Harness and evidence                                                                                                                                                                             |
| ----------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Helper semantics or type identity                                                   | Compiler/helper tests        | Minimal compiler setup and typed extraction; use Azure libraries only when the helper needs them.                                                                                                |
| One rule's predicate, message, count, or authored target                            | Rule behavior tests          | Existing single-rule tester, such as `LinterRuleTester`, with literal TypeSpec fixtures and exact diagnostic assertions.                                                                         |
| Registered execution, suppression, cross-rule interaction, or metadata side effects | Integration tests            | Activate the real registered linter and relevant rules; prove the otherwise-offending preconditions and expected interaction.                                                                    |
| Exported rules, legacy names, registration, or ruleset activation                   | Package/registration tests   | Exercise the actual public registration surface using existing package infrastructure.                                                                                                           |
| Public-entry loading or dependency isolation                                        | Package-isolation tests      | Load the real public entry point; for isolation, block the relevant dependency. Execute native linting when execution independence is the claim. Do not substitute raw-source import inspection. |
| Published examples compile and demonstrate the rule                                 | Documentation tests          | Compile the actual published snippets, explicitly enable the rule, and assert the incorrect/correct diagnostic contrast.                                                                         |
| Swagger parity or corpus population differences                                     | Migration/comparison harness | Keep emitted-output snapshots, population attribution, and parity evidence outside native rule behavior suites.                                                                                  |

These are placement rules, not a mandatory set of suites for every rule.
Use the repository's existing harnesses and organization; a distinct layer need
not mean a new file per rule or a new general-purpose harness.

First establish that a claim needs rule-specific evidence. A PR promise alone
does not make generic suppression or enablement a rule-owned requirement.
Delete framework-only cases without replacement; do not relocate them merely
to preserve a checklist. Retain concrete rule-caused interactions, authored-node
deduplication and demonstrated regressions. Update stale PR claims accordingly.

Relocate required acceptance evidence instead of silently deleting it during
unit-test cleanup. A registration or interaction test is not a framework-only
test merely because it is unnecessary in the single-rule suite. Retain it in
the appropriate layer when the contract or a demonstrated regression requires
it. Truly redundant framework proof needs no replacement. Record the destination
or justified removal before deleting a case.

### Setup, extraction, and exact targets

- Reuse the package's configured tester for ordinary rule behavior, following
  its asynchronous setup and fresh-instance lifecycle.
- For standalone snippets whose explicit imports/usings are part of the claim,
  use a shared unwrapped base that registers available libraries without
  injecting imports, usings, or a service wrapper. Derive the configured tester
  from that base when a shared base is needed; do not duplicate library lists or
  assume names such as `UnwrappedTester` or `ArmBaseTester` already exist.
- Keep compiler-only helper fixtures compiler-only, such as `libraries: []`
  where supported. Do not add ARM initialization solely for setup uniformity.
- Prefer supported typed extraction markers such as `t.model`, `t.union`,
  `t.op`, and `t.modelProperty` to namespace/interface walks. For example, with
  the installed compiler's `t` helper:

  ```typescript
  const { Widget, Choice, read } = await tester.compile(t.code`
    model ${t.model("Widget")} {}
    union ${t.union("Choice")} { Widget, null }
    op ${t.op("read")}(): Widget;
  `);
  ```

- Use supported position/span markers for authored diagnostic targets, such as
  `/*target*/` and `result.pos.target.pos`, rather than source-file searches,
  `indexOf`, or hand-maintained offsets. Verify the installed tester's API and
  neighboring tests; entity markers and position markers serve different claims.
- Treat manual lookup or offset calculation as an exception requiring a concrete
  API limitation. Typed extraction must preserve the original identity,
  inherited-property, encoded-name, visibility, or target assertions.

## Rule-test responsibility boundary

Keep native rule unit tests focused on the rule's predicate, supported target
kinds, and diagnostic contract. Do not re-test behavior owned by the compiler,
linter framework, or shared test harness in every rule suite.

- Do not add native rule unit tests solely to prove imported-library exclusion, suppression or
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
  scope without replacement; retain any distinct rule assertion in a simpler
  case. If a genuine framework regression needs coverage, place it in the owning framework/helper
  suite rather than duplicating it across rules. Do not edit unrelated PRs unless
  that cleanup is explicitly part of the task.
  First account for required non-unit acceptance evidence through the
  [test-claim matrix](#test-claim-matrix); moving that proof is not deleting it.
- Keep migration fixtures and corpus comparisons that explain Swagger/TypeSpec
  differences in the migration harness. They do not automatically become native
  rule unit tests; record why a framework-only fixture is not ported.
- Do not add per-rule tests that read or parse implementation source to assert
  import lists, forbidden dependencies/APIs, helper names, or source layout.
  These assert implementation structure, not the rule's diagnostic contract,
  and can miss dependencies through reachable helpers. Check architectural
  constraints in review and existing repository-wide lint/dependency tooling;
  do not invent a source-inspection test or new harness for each rule.
- Do not turn emitted-reference strings or legacy emitter metadata into a native
  test matrix when the rule does not inspect them. For a native standard-type
  requirement, test the standard type and a custom type directly; varying an
  external reference's path, version, or definition adds no predicate coverage.
  Keep reference-format parity evidence in migration fixtures or PR notes.
  Cover version selection or metadata only when a rule-owned decision depends
  on it, rather than treating every migration constraint as a unit-test case.

For example, a summary/documentation equality rule needs equality, inequality,
missing-value, normalization, and supported-declaration cases. A fake imported
package proving that the linter filters library declarations adds no coverage of
that predicate. A rule that implements its own service guard does need included
and excluded service cases.

This boundary incorporates the
[review feedback on #5507](https://github.com/Azure/typespec-azure/pull/5507#discussion_r4093555025)
and the [review on #5451](https://github.com/Azure/typespec-azure/pull/5451#pullrequestreview-5507879303),
which rejected external-reference-only cases and raw-source import inspection.

## Contract-driven coverage

Map each rule-owned decision in the
[native rule contract](../typespec-lint-discovery/SKILL.md#native-rule-contract)
to a concrete test, applying the [responsibility boundary](#rule-test-responsibility-boundary)
first. The dimensions below are not an unconditional test matrix for every rule:

- Before changing production logic for an alleged gap, reproduce it with an
  offending case and a nearby valid control. State which wrong behavior makes
  the regression fail. If current logic already handles both, retain useful
  regression coverage without adding duplicate traversal or special cases.
- Ensure the case reaches the intended listener and decision. Preserve concrete
  instantiations and relevant identity, visibility, LRO recognition, and response
  preconditions. An uninstantiated template filtered before the listener, or an
  exemption test with no otherwise-offending input, is not discriminating proof.
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

Keep literal behavior fixtures independent of Markdown layout. For Swagger/LintDiff
migrations, do not add bespoke per-rule Markdown parsers or relocate
them into a separate suite. Remove such parsers while retaining useful literal
semantic cases; a shared documentation-testing system belongs in a separate task.

Use existing shared documentation/example infrastructure or a one-time scratch
execution against the actual published snippets. Record the document revision
or content hash, setup, command and diagnostic evidence in the validation
handoff or PR notes. A one-time receipt is not continuous documentation coverage.
When existing infrastructure extracts examples, select the actual published
snippets by semantic section or stable identity, requiring an unambiguous match.
Do not assert global fence counts, use positional fence indexes, or compile only
copied text while claiming to validate the published document.

Validate the actual incorrect/correct snippets through the repository's existing
example workflow or one-time execution, adding only the imports and
service/resource setup needed to compile them. Record that setup so the result is reproducible;
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
- Enforce the template-first authoring policy: when supported templates can
  demonstrate the incorrect/correct pair, require those templates instead of raw
  routes. A generic HTTP audience or successful compilation is not an exception;
  require a documented template limitation for any handwritten fallback.
- Record the example audience, chosen template/customization or justified
  handwritten exception, and diagnostic evidence in the validation handoff or
  PR notes. Reuse existing shared example infrastructure or one-time execution
  instead of forcing ARM dependencies into a Core unit-test suite. If no suitable
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
- acceptance-claim mapping, including relocated evidence and justified removals
- any small corrective edits made during validation
- the next action if the rule still does not meet expectations

## Portability rules

- Discover the repository's validation loop rather than assuming one.
- Treat scratch projects, sample specs, and snapshot harnesses as repository-specific implementations of the same broader testing need.
- Keep the loop focused; do not default to a full repo test run unless the narrower evidence is not enough.

## Example invocations

- `/typespec-lint-validate add violation and compliance tests for the new rule and run the narrowest useful validation loop`
- `/typespec-lint-validate validate the rule in scratch first, then update package-native tests`
