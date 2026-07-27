---
name: lintdiff-rule-reimport-repair
description: Re-import one named azure-openapi-validator rule, compare it against the local migrated state, and repair the rule, fixtures, tests, or classification when the current import is wrong or incomplete.
argument-hint: "[validator rule name]"
user-invocable: true
---

# Re-import and repair one validator rule

Use this skill when the repository already has migration artifacts for a named `azure-openapi-validator` rule and you want to **audit and repair the existing import**, not treat the rule as a clean-sheet migration.

This skill is intentionally **one rule at a time**. The goal is an auditable repair pass with a clear outcome for that single rule.

Use the [repair checklist](./repair-checklist.md) to keep the pass grounded in source evidence and repository quirks.

## Process

1. Reconstruct the upstream source of truth for the named rule:
   - rule documentation
   - rule registration metadata
   - implemented selector or logic
   - upstream tests
2. Extract the **upstream semantic matrix** from the implementation and upstream tests:
   - violating cases
   - compliant cases
   - ignored or filtered cases
   - edge cases that define the rule boundary
   - any behavior that is documented but not actually implemented, or implemented but not documented
3. Inspect the local migrated state:
   - `tests/<RuleName>/rule.md`
   - violating and compliant fixtures
   - stored validator diagnostics
   - stored TypeSpec diagnostics
   - any local linter rule and registration
   - `validate-report.md`, `catalog.json`, or other migration inventory evidence
4. Inspect the local repros for blocking or prerequisite evidence:
   - `#suppress` directives
   - unrelated TypeSpec diagnostics that already forbid the construct
   - template-enforced behavior
   - `disableForTypeSpec` or equivalent upstream hints
5. Compare upstream and local behavior carefully, with these priorities:
   - **implementation and upstream tests override prose documentation** when they disagree
   - local metadata and descriptions must match the implemented rule scope
   - local fixtures must cover the **full upstream semantic matrix**, not just one reproducer
   - if some upstream semantic cells are not authorable in TypeSpec, identify them explicitly instead of silently dropping them
6. Decide the strongest supported outcome for the current local import:
   - already correct
   - already covered another way
   - blocked or suppression-dependent
   - test-quality issue
   - partial import needing correction
   - real remaining gap needing native lint work
7. If a repair is justified, update the smallest complete set of local artifacts:
   - local linter rule implementation and registration
   - `tests/<RuleName>/rule.md`
   - violating/compliant/ignored-edge fixtures needed to represent the upstream semantics
   - `expect.json` files when harness intent needs correction
   - focused snapshots and validation report artifacts
8. Validate the repaired rule against the semantic matrix:
   - ensure each meaningful upstream semantic case is covered by one or more local fixtures, or explain why it cannot be authorably represented in TypeSpec
   - do not call the re-import complete if coverage only proves a single violating example while leaving the rest of the upstream behavior untested
   - if the rule remains blocked or partial, say exactly which semantic cases remain unrepresentable or unproven
9. End with a concise statement of what changed and why the repaired state is more trustworthy than the previous import.

## Guardrails

- Do **not** create or expand a native lint just because a doc page suggests broader behavior; confirm the actual validator implementation and tests first.
- Do **not** treat a suppression-dependent repro as proof of a true native lint gap.
- Do **not** assume `rule.md` drives harness intent for compliance cases; check `expect.json`.
- Do **not** ignore repository constraints such as local severity limitations or explicit report-generation steps.
- Do **not** accept a repaired import as semantically complete unless the local tests cover the full upstream rule behavior or explicitly document the unrepresentable cases.
- Keep the scope to **one named rule**. If multiple rules look related, finish the current rule before moving on.

## Deliverable

Produce:

- the repaired or reclassified outcome for the named rule
- the upstream and local evidence that supports it
- the upstream semantic matrix and how each cell is covered locally
- the repository artifacts updated as part of the repair
- any residual mismatch or follow-up, if the rule still cannot be made fully trustworthy in one pass

## Recommended sequencing

This skill may reuse the intake and migration skills for supporting evidence, but it should not stop at classification. Its job is to **repair the current imported state** when the evidence shows the existing import is wrong, incomplete, or misleading.

## Example invocations

- `/lintdiff-rule-reimport-repair MutabilityWithReadOnly`
- `/lintdiff-rule-reimport-repair ParametersSchemaAsTypeObject`
