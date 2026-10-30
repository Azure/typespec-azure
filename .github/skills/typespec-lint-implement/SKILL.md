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
5. Identify the minimum validation coverage for the rule's predicate, supported
   target kinds, and diagnostics, following the
   [rule-test responsibility boundary](../typespec-lint-validate/SKILL.md#rule-test-responsibility-boundary).
   Do not copy neighboring framework-only tests or add production guards merely
   to justify such tests. Follow the shared
   [canonical suite and grouping policy](../typespec-lint-validate/SKILL.md#canonical-suite-ownership-and-grouping)
   and [public-API fixture guidance](../typespec-lint-validate/SKILL.md#setup-extraction-and-exact-targets).
6. Hand off to `/typespec-lint-validate` with a clear statement of what should now be proven.

## Implementation checkpoints

Use the [native rule contract](../typespec-lint-discovery/SKILL.md#native-rule-contract)
as the acceptance criteria. If a required decision is unresolved, return to
discovery rather than silently choosing different semantics.

- Use the narrowest semantic layer that answers the question: a type-only check
  need not resolve HTTP operations; an HTTP policy still needs HTTP metadata.
  Prefer supported TypeKit/compiler predicates over custom scalar-name checks.
- Normalize input and apply cheap, semantics-preserving exclusions before
  expensive semantic metadata resolution. Where this ordering addresses a
  regression, prove both the unchanged diagnostic behavior and the avoided
  resolution path; do not skip metadata needed to decide the rule.
- Prefer direct construction and calls for a small fixed set of validators
  over a mutable registry/map/dispatcher without an actual extension need.
  Retain focused helpers, deduplication, and exemptions when they serve the
  contract; simplicity is not a blanket ban on helper files.
- Compare helper behavior before sharing it. Serialized parameter-name equality,
  for example, is not equivalent to checking the parameter's common-type origin.
  Share equivalent predicates; keep distinct policies separate. Name helpers
  after what they actually inspect, not conditions checked only by their callers.
- For HTTP query checks, prefer the supported property metadata API (currently
  `httpOperation.parameters.properties`): distinguish `kind`, use the serialized
  `options.name` for wire-name policies, and target the authored `property`.
  Verify the repository's installed API rather than copying an obsolete shape.
- Require a supported-input regression case for added complexity. Keep a scope
  guard or SDK-name resolver when an independently justified native requirement
  needs it, not merely because the current implementation and tests use it.
  Compare related rules' scope and name-resolution policy.
  Apply the [discriminating coverage gate](../typespec-lint-validate/SKILL.md#contract-driven-coverage)
  before rewriting logic for an alleged miss.
- Report each independently actionable violation on its authored target. Avoid
  redundant aggregate diagnostics for the same finding; define fallback targets
  for missing constructs. Keep messages concise and move compatibility impact
  and suppression rationale into documentation.
- When renaming or changing semantics, update implementation, tests,
  registration, rulesets, docs/links, and change metadata together. Describe
  registered-but-inactive behavior accurately; availability is not activation.
- Keep recommended/default preset enablement separate from library `all`
  membership. Do not add a per-rule `all` exclusion solely to keep a new rule
  disabled in a recommended preset. Follow existing package conventions and
  preserve independently justified audience-specific exceptions.
- Apply the [native rule documentation contract](#native-rule-documentation)
  when writing or updating user-facing rule documentation.

## Simplification and review

A rule brief and PR description record the proposed design, not a requirement
that overrides review asking to simplify, revert or consolidate it.

- Record the requested direction and compare the smallest alternative using
  existing native mechanisms before defending the current architecture.
  For each behavior that would change, distinguish a required native guideline,
  verified released compatibility, legacy parity and a choice introduced by
  the proposal. Tests of that choice do not establish an independent requirement.
- A behavior difference is a tradeoff to assess, not by itself a reason to
  reject simplification. Prefer extending an existing rule when its native
  responsibility remains coherent; assess actual enablement and suppression
  effects separately, distinguishing proposed IDs/APIs from released contracts.
- Name any specific unresolved policy choice, explicit request for another
  maintainer's input or missing authorization. Do not invent a decision gate
  solely because the reviewer challenges the proposed contract, and do not
  accept a suggestion solely on reviewer authority.
- Keep permissions, required validation and source-immutability boundaries.
  When the recommendation requires authorized source repair, report that
  handoff separately from the design recommendation; do not silently diverge
  in the promoted copy. Update the brief, tests, docs and PR claims together
  when an in-scope redesign is authorized.
- Track replying separately from satisfying the request. An explanation of the
  current design is not evidence that a simplification concern was addressed;
  identify the implemented change, outstanding action or evidence-backed
  qualified rejection without implying reviewer agreement.

## Native rule documentation

Write the main documentation for a TypeSpec author who does not know the source
validator or migration history:

- Explain the native requirement, applicability, rationale, and corrective
  TypeSpec pattern. Describe accepted and rejected authoring constructs directly.
- Omit routine "this rule is opt-in", enable-this-rule, and ruleset-membership
  boilerplate from individual rule pages. Keep activation bookkeeping in central
  linter/ruleset references and migration NOTES. Include rule-specific configuration
  only when needed to explain applicability or the corrective authoring pattern;
  this does not change actual defaults or their required validation.
- Do not explain the rule by contrasting TypeSpec models with emitted OpenAPI
  references, Swagger reference overrides, or legacy validator mechanics, even
  when that comparison is technically accurate. Do not recommend an output
  reference override as a substitute for the required native type.
- Keep historical provenance and parity comparisons in a dedicated migration
  section (such as `## LintDiff Equivalent`), migration evidence, and the PR
  description, not the main explanation or incorrect/correct examples.
- When an existing rule replaces a proposed Swagger/LintDiff migration, add
  the original validator's linked name and evidenced coverage boundaries to
  that existing rule's provenance section, even if no implementation changes
  are needed. Preserve other mappings and distinguish partial coverage from
  full equivalence under the
  [existing-rule coverage contract](../lintdiff-rule-migration-overseer/SKILL.md#existing-rule-coverage-contract).
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

### Example authoring

Choose the example's audience explicitly: ARM resource authoring, data-plane,
or generic HTTP/type semantics. Package ownership alone does not choose that
audience: a shared Core rule can still need an ARM resource example.

- For ARM resource scenarios, use standard ARM operation templates in both the
  incorrect and correct examples. Express the violation through supported named
  customization arguments and omit unchanged defaults.
- For every audience, prefer supported standard operation templates over raw
  routes or handwritten operations whenever templates can demonstrate both the
  incorrect and correct behavior. Inspect the relevant template's customization
  points before choosing handwritten examples. Use the template appropriate to
  the audience; do not introduce ARM solely because the rule also applies to ARM.
- Choosing a generic HTTP audience does not waive template selection. If an
  ARM-applicable rule can demonstrate its behavior with standard ARM templates,
  include that template-based incorrect/correct pair rather than using only raw
  routes. Additional audience-specific examples may supplement it.
- Use handwritten routes or operations only when no suitable supported template
  can preserve the rule-owned diagnostic contrast. Record the inspected
  template/customization limitation and the reason for the exception in validation
  evidence or PR notes. Brevity or destination package alone is not a reason.
- Preserve the semantic contrast when adopting templates. Both examples must
  reach the rule's intended check; the correction should fix the violation,
  not merely switch to an exempt construct. For an implicit-response-body rule,
  for example, a default template returning an explicit body is not a substitute
  for a violating implicit response customization.

Apply the [documentation example validation](../typespec-lint-validate/SKILL.md#documentation-example-validation)
gate to the actual published snippets. This authoring policy does not require
rewriting focused semantic unit tests around ARM templates.

### Final contract consistency

Before publication, reconcile the final diff and PR acceptance claims with the
native contract and [test-claim mapping](../typespec-lint-validate/SKILL.md#test-claim-matrix):

- Remove task-related unused helpers/imports, obsolete scaffolding, vacuous
  cases, and redundant permutations without losing distinct semantic controls
  or required acceptance evidence.
- Check canonical suite ownership, meaningful scenario grouping, and public
  fixture APIs under the shared validation guidance. Reject relocated duplicate
  rule suites and bespoke Markdown parsers, not legitimate utility/package tests.
- Check final scope, defaults, exclusions, exceptions, diagnostic targets, and
  native-versus-legacy differences across implementation, actual published
  examples, authored/generated references, manual guides, and legacy mappings.
- Recheck SDK impact and compatibility guidance. Show the fully qualified rule
  ID and correct placement in suppression examples. Retain registered
  suppression coverage only for a concrete rule-owned interaction or
  demonstrated regression, not merely because it was promised in the PR.
- Apply the [unreleased change-entry policy](#unreleased-change-entries):
  describe final shipped behavior rather than accumulating review-history entries.
- Evaluate reviewer suggestions against current code, the contract, and PR
  promises using the [simplification review guidance](#simplification-and-review).
  Do not impose blanket bans on isolated testers, integration tests, compiling
  examples or helpers. For Swagger/LintDiff migrations, apply the specific
  [no-bespoke-parser guidance](../typespec-lint-validate/SKILL.md#documentation-example-validation).

### Unreleased change entries

Before adding a Chronus entry, inspect the task-owned unreleased entries for
each affected package. Ensure coverage, not a new file per commit or review
round. Update the existing feature/fix description to match final shipped
behavior instead of adding an internal entry for review cleanup, helper reuse,
test changes, formatting, or syncing with the base branch.

Remove redundant task-owned internal coverage when that package already has
a feature/fix entry for the same unreleased change. For a multi-package entry,
remove only the redundant package and retain genuinely needed coverage for
other packages. Preserve distinct release classifications, unrelated entries,
and separate disabled-registration coverage for a rulesets package without a
feature/fix entry for that change. Validate Chronus normally; do not add entries
merely to satisfy package detection. See the
[changelog feedback on #5502](https://github.com/Azure/typespec-azure/pull/5502#discussion_r4294559315).

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
