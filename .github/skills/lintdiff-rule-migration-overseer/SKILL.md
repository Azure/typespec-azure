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
4. Only if the rule is a true gap or an incomplete partial should this skill drive native-rule work.
5. When native work is justified, sequence the generic skills explicitly:
   - `/typespec-lint-discovery` for the native-rule brief
   - `/typespec-lint-implement` for code changes
   - `/typespec-lint-validate` for tests and focused validation
6. Update the local migration evidence that should reflect the result, such as rule metadata, focused fixtures, reports, or other repository-native migration artifacts.
7. End with a concise statement of whether native-rule work was necessary and what evidence supports that claim.

## Guardrails

- Do not assume every validator rule deserves a brand-new native lint.
- If a violating repro requires suppressing an unrelated TypeSpec diagnostic, treat that as strong evidence that the case may already be blocked by existing linting.
- Prefer proving existing coverage or documenting blocking/template behavior over inventing redundant lints.
- If the repository lacks a comparison harness or local migration inventory, say so explicitly and limit claims to the evidence that is actually available.

## Deliverable

Produce:

- the classification
- the evidence supporting it
- any delegated implementation or validation work
- the repository artifacts updated as a result
- the next recommended action, if any

## Example invocations

- `/lintdiff-rule-migration-overseer shortlist migration candidates in this repo that do not depend on suppressing unrelated TypeSpec diagnostics`
- `/lintdiff-rule-migration-overseer migrate ResourceNameRestriction end-to-end, but only if intake shows it is a real gap`
