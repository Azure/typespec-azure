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
   - registration metadata such as rule IDs, severity, selectors, and any TypeSpec-disablement notes
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
4. Decide the strongest currently supported status hypothesis:
   - already covered
   - template-enforced
   - blocked by prerequisite diagnostics / suppression-dependent repro
   - partial
   - plausible gap
   - or test-quality issue
5. End with a reusable intake summary that another skill or engineer can build on directly.

## Deliverable

Produce:

- a concise rule summary in plain language
- the upstream/source-of-truth evidence
- the local repository evidence
- suppression and prerequisite findings
- the strongest current classification hypothesis
- the recommended next skill, usually `/lintdiff-rule-migration-overseer` or `/typespec-lint-discovery`

## Repository adaptation notes

In repositories like this one, expect to inspect artifacts such as `ONBOARDING.md`, `catalog.json`, `validate-report.md`, `tests/<RuleName>/rule.md`, fixture snapshots, and validation scripts.

If a target repository lacks some of those artifacts, say exactly what is missing and continue with the strongest evidence that is available.

## Example invocations

- `/lintdiff-rule-intake MutabilityWithReadOnly`
- `/lintdiff-rule-intake ResourceNameRestriction`
