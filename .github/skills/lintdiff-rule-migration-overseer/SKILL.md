---
name: lintdiff-rule-migration-overseer
description: Screen migration candidates or drive the end-to-end migration of a named LintDiff or azure-openapi-validator rule to a native TypeSpec outcome. Use this when you need classification first, not just implementation, and only want native-rule work when it is genuinely justified.
argument-hint: "[rule name or candidate-screening goal]"
user-invocable: true
---

# LintDiff rule migration overseer

Use this skill when the task is to **screen migration targets or migrate one validator rule end-to-end**.

This skill is the orchestrator. It should not blindly create new native lints. It should gather evidence, classify the situation, and only then decide whether implementation work is warranted.

Use the [classification guide](./classification-guide.md) when deciding how to frame the result.

## Process

1. If the user did not name a rule, shortlist candidates that look safe to migrate now:
   - focused violating fixtures
   - clear metadata or response-shape story
   - no obvious suppression-dependent repros
   - no existing direct coverage already present
2. If the user named a rule, perform the full intake process used by `/lintdiff-rule-intake`, or reuse an intake that is already available.
3. Classify the rule using the strongest evidence available:
   - already covered
   - template-enforced
   - blocked / suppression-dependent
   - partial
   - true gap
   - test-quality issue
4. Apply the [existing-rule coverage contract](#existing-rule-coverage-contract).
   Only a true gap or an evidenced incomplete partial warrants native code work;
   partial coverage requires an extension-versus-new-rule decision first.
5. When native work is justified, sequence the generic skills explicitly:
   - `/typespec-lint-discovery` for the native-rule brief
   - `/typespec-lint-implement` for code changes
   - `/typespec-lint-validate` for tests and focused validation
6. Update the local migration evidence that should reflect the result, such as rule metadata, focused fixtures, reports, or other repository-native migration artifacts.
   When an existing rule supplies coverage, also update that rule's authored
   documentation under the coverage contract; migration notes alone are insufficient.
7. End with a concise statement of whether native-rule work was necessary and what evidence supports that claim.

## Guardrails

- Do not assume every validator rule deserves a brand-new native lint.
- If a violating repro requires suppressing an unrelated TypeSpec diagnostic, treat that as strong evidence that the case may already be blocked by existing linting.
- Prefer proving existing coverage or documenting blocking/template behavior over inventing redundant lints.
- If the repository lacks a comparison harness or local migration inventory, say so explicitly and limit claims to the evidence that is actually available.

## Existing-rule coverage contract

Before adding or retaining a migrated lint, compare the validator's material
checks with existing native rules, compiler/library diagnostics, and templates.
Use implementation and supported violating/compliant examples as evidence, not
similar names, a documentation mapping, or matching corpus counts alone. Record
each check's native owner, applicability and enablement, exemptions, diagnostic
target/unit, and any remaining gap. One native rule may cover several validator
rules, and one validator rule may be covered by several native controls.

Choose the outcome explicitly:

- **Full existing coverage:** reuse the existing rule without adding a duplicate
  or changing its behavior merely to claim migration completion.
- **Partial existing coverage:** identify the precise missing behavior and
  evaluate extending the existing rule before proposing a separate one. Extend
  only when its native intent, owner, audience, and diagnostic contract remain
  coherent. Document compatibility and enablement effects, and require focused
  regression coverage for existing behavior as well as the missing check.
- **Distinct gap:** add a separate rule only when evidence shows a distinct
  responsibility or an extension would improperly broaden an existing contract.
  Explain the boundary so enabled rules do not report duplicate findings for
  the same independently actionable violation.

Whenever a proposed new rule is omitted, withdrawn, or replaced because an
existing rule covers it, update the **existing rule's authored documentation**.
In its dedicated migration/provenance section (such as
`## LintDiff Equivalent`), name and link the original Swagger/LintDiff rule,
explain which checks are covered, and state material scope differences or
limitations. Preserve existing mappings; never label partial coverage as full
equivalence. Keep the main explanation native-first under the
[native documentation contract](../typespec-lint-implement/SKILL.md#native-rule-documentation).
Regenerate affected public docs when required by the repository and verify the
mapping is present. Migration notes, catalogs, and PR descriptions supplement
this documentation; they do not replace it.

For template/compiler enforcement without an owning lint, document the actual
control in the relevant template/compiler guidance or coverage inventory rather
than attributing it to an unrelated rule. Keep authorability, lint activation,
native guideline coverage, emitted-output parity, and count parity distinct.

These requirements do not authorize edits outside the task's worktree,
publication ownership, or source-immutability boundaries. If the owning rule's
docs cannot be updated within the authorized scope, report the exact outstanding
documentation change and required handoff; do not claim the documentation work
is complete or create a redundant lint to avoid that handoff.

## Deliverable

Produce:

- the classification
- the evidence supporting it
- the reuse, extension, or separate-rule decision and affected existing-rule
  documentation, including any outstanding authorized handoff
- any delegated implementation or validation work
- the repository artifacts updated as a result
- the next recommended action, if any

## Example invocations

- `/lintdiff-rule-migration-overseer shortlist migration candidates in this repo that do not depend on suppressing unrelated TypeSpec diagnostics`
- `/lintdiff-rule-migration-overseer migrate ResourceNameRestriction end-to-end, but only if intake shows it is a real gap`
