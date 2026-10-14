---
name: lintdiff-rule-intake
description: Gather the source-of-truth information for a named LintDiff or azure-openapi-validator rule, plus the local repository evidence relevant to migrating it. Use this when you need to understand one rule deeply before deciding whether it is covered, blocked, partial, or a real migration gap.
argument-hint: "[validator rule name]"
user-invocable: true
---

# LintDiff or azure-openapi-validator rule intake

Use this skill when the task is about a **specific named validator rule** and you need a complete intake before taking action.

The goal is not to code immediately. The goal is to gather the evidence needed to make a trustworthy migration decision.

Use the [evidence checklist](./evidence-checklist.md) to make sure the intake is complete.

## Process

1. Gather upstream or source-of-truth material for the named rule:
   - rule documentation
   - validator implementation
   - validator tests
   - registration metadata such as rule IDs, severity, selectors, `openapiType`,
     category, caller-selected subtype, and any TypeSpec-disablement notes
   - the [validator audience contract](#validator-audience-contract), separately
     from the catalog's coarse applicability label
2. Inspect the local repository for migration-specific evidence:
   - `tests/<RuleName>/rule.md` if it exists
   - local violating and compliant fixtures
   - stored validator diagnostics and TypeSpec diagnostics
   - current coverage reports, catalogs, or migration inventories
   - any comparison harness or targeted validation scripts
3. Inspect the local TypeSpec repros for prerequisite or blocking evidence:
   - `#suppress` directives
   - unrelated TypeSpec diagnostics that would already forbid the construct
   - template-enforced behavior
4. Draft the [native rule contract](../typespec-lint-discovery/SKILL.md#native-rule-contract)
   from that evidence. Separate the intended guideline from the Swagger
   selector/emitted representation, and distinguish native violation coverage,
   emitted-output equivalence, and diagnostic-count equivalence. Record a
   supported TypeSpec example or rejection evidence for every material
   difference; an unexplained mismatch is still unresolved, not intentional.
5. Decide the strongest currently supported status hypothesis:
   - already covered
   - template-enforced
   - blocked by prerequisite diagnostics / suppression-dependent repro
   - partial
   - plausible gap
   - or test-quality issue
6. End with a reusable intake summary that another skill or engineer can build on directly.

## Deliverable

Produce:

- a concise rule summary in plain language
- the upstream/source-of-truth evidence
- the local repository evidence
- suppression and prerequisite findings
- the native contract, candidate ownership/API surface, and evidenced parity
  differences or unresolved questions; do not invent emission-simulation work
  solely to match Swagger artifacts or counts
- the strongest current classification hypothesis
- the recommended next skill, usually `/lintdiff-rule-migration-overseer` or `/typespec-lint-discovery`

## Repository adaptation notes

In repositories like this one, expect to inspect artifacts such as `ONBOARDING.md`, `catalog.json`, `validate-report.md`, `tests/<RuleName>/rule.md`, fixture snapshots, and validation scripts.

If a target repository lacks some of those artifacts, say exactly what is missing and continue with the strongest evidence that is available.

## Validator audience contract

Catalog `ARM`/`Both` eligibility is not proof that a validator runs for every ARM
service. Inspect upstream registration and the caller's rule-selection mechanism
before classifying coverage or choosing a native owner. In particular, RPaaS
registration can be flattened to `common`/`Both` by an importer; record that
discrepancy without changing the catalog schema or bypassing the eligibility gate.

Record the upstream audience and its selection evidence, the native guideline
and predicate, diagnostic unit/target, native applicability boundary, enablement
policy, and validation profiles. Distinguish these supported outcomes:

- A supported native API identifies the intended audience.
- Independent authoritative evidence establishes a broader native guideline.
  An existing RPaaS-related ARM rule is prior art, not proof that another
  RPaaS restriction applies universally.
- Existing explicit lint enablement supplies an externally selected audience.
  Absence of an automatic RPaaS detector alone does not block this option when
  the intended guideline and valid native examples are established. Document the
  actual configuration boundary and mixed-audience limitations; enablement does
  not infer each operation's RPaaS affiliation.

For the externally selected option, keep the rule out of general/default,
recommended, and `all` enablement that would imply universal applicability.
Preserve existing rules' enablement. Document how the intended audience opts in
and why supported ordinary ARM examples must not be restricted by default.
Unknown guideline, unsafe audience isolation, or missing evidence still blocks
classification. Do not invent decorators, parse readmes/subtypes or emitted
Swagger in production, or require SDK dependencies to manufacture a selector.

For example, `ExtensionResourcePathPattern` is registered for RPaaS and rejects
paths containing repeated literal `/providers/` segments. A concrete-parent
`Extension.ExternalResource` path can legitimately have those segments in
ordinary ARM; `Extension.ScopeParameter` provides the RPaaS-compatible scope
form. This supports an explicitly enabled RPaaS routing contract, not blanket
ARM enforcement.

Validate both the predicate and activation boundary. Use explicitly enabled
violating/compliant native cases, supported ordinary ARM counterexamples, and
the appropriate fixture/ruleset integration checks for default inactivity.
Record the validator's actual selection and the TypeSpec rule selection
separately. A direct validator predicate call proves neither engine registration
nor RPaaS audience selection. A generic ARM corpus with this rule disabled,
including target counts of `0/0`, proves no RPaaS equivalence; report it as
default-inactivity/regression evidence. Keep enabled fixture evidence, audience
and version populations, diagnostic-unit differences, compile failures, and
unverified validator-source identity explicit.

Carry this contract and its evidence into development, migration notes,
promotion, and both review handoffs. Do not replace it with the catalog label or
broaden it merely because the destination package is ARM.

## Example invocations

- `/lintdiff-rule-intake MutabilityWithReadOnly`
- `/lintdiff-rule-intake ResourceNameRestriction`
