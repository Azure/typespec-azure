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

## Implementation checkpoints

Use the [native rule contract](../typespec-lint-discovery/SKILL.md#native-rule-contract)
as the acceptance criteria. If a required decision is unresolved, return to
discovery rather than silently choosing different semantics.

- Use the narrowest semantic layer that answers the question: a type-only check
  need not resolve HTTP operations; an HTTP policy still needs HTTP metadata.
  Prefer supported TypeKit/compiler predicates over custom scalar-name checks.
- Compare helper behavior before sharing it. Serialized parameter-name equality,
  for example, is not equivalent to checking the parameter's common-type origin.
  Share equivalent predicates; keep distinct policies separate. Name helpers
  after what they actually inspect, not conditions checked only by their callers.
- For HTTP query checks, prefer the supported property metadata API (currently
  `httpOperation.parameters.properties`): distinguish `kind`, use the serialized
  `options.name` for wire-name policies, and target the authored `property`.
  Verify the repository's installed API rather than copying an obsolete shape.
- Require a supported-input regression case for added complexity. Keep a scope
  guard or SDK-name resolver when the contract requires it; do not remove it
  solely to reduce code. Compare related rules' scope and name-resolution policy.
- Report each independently actionable violation on its authored target. Avoid
  redundant aggregate diagnostics for the same finding; define fallback targets
  for missing constructs. Keep messages concise and move compatibility impact
  and suppression rationale into documentation.
- When renaming or changing semantics, update implementation, tests,
  registration, rulesets, docs/links, and change metadata together. Describe
  registered-but-inactive behavior accurately; availability is not activation.
- Apply the [native rule documentation contract](#native-rule-documentation)
  when writing or updating user-facing rule documentation.

## Native rule documentation

Write the main documentation for a TypeSpec author who does not know the source
validator or migration history:

- Explain the native requirement, applicability, rationale, and corrective
  TypeSpec pattern. Describe accepted and rejected authoring constructs directly.
- Do not explain the rule by contrasting TypeSpec models with emitted OpenAPI
  references, Swagger reference overrides, or legacy validator mechanics, even
  when that comparison is technically accurate. Do not recommend an output
  reference override as a substitute for the required native type.
- Keep historical provenance and parity comparisons in a dedicated migration
  section (such as `## LintDiff Equivalent`), migration evidence, and the PR
  description, not the main explanation or incorrect/correct examples.
- Mention OpenAPI or emitter behavior in the main documentation only when it
  explains an actual user-facing requirement or consequence of the native rule,
  not merely how the migrated validator worked. This is an audience/content
  check, not a blanket ban on those words.

For example, a rule requiring `CommonTypes.ErrorResponse` should explain that
requirement and its supported TypeSpec authoring forms, without adding "not an
emitted OpenAPI reference" or discussing Swagger reference overrides.

Before handoff, read the main explanation and examples without the migration
section: they must stand alone as native TypeSpec guidance. Check both the
authored documentation and regenerated public pages when applicable; correct
the authored source and regenerate rather than patching generated copies.

## Deliverable

Produce:

- the implementation or modification
- any rule wiring or registration changes
- concise notes on important design choices, including sibling/API comparison
  and the supported cases justifying custom logic
- the exact validation/testing follow-up that should run next

## Portability rules

- Do not assume the target repository uses this repo's `linter/` or `scratch/` layout.
- Discover the local package structure and adapt to it.
- Use repository-native commands, test frameworks, and file organization once discovered.

## Example invocations

- `/typespec-lint-implement implement the rule from the brief above in the local lint package`
- `/typespec-lint-implement modify the existing rule so boolean properties are ignored when they already have an enum metadata helper`
