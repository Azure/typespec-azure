---
name: typespec-lint-discovery
description: Investigate a TypeSpec lint idea, inspect prior art, and produce an implementation-ready rule brief. Use this when a lint problem is not yet fully specified, when you need to discover relevant compiler or library APIs, or when you need to decide whether a new lint should exist at all.
argument-hint: "[rule idea, failing pattern, or policy requirement]"
user-invocable: true
---

# TypeSpec lint discovery

Use this skill when the problem is still at the **rule-definition** stage.

## Use this skill for

- turning a policy, complaint, or migration need into a concrete lint brief
- checking whether an existing lint or template rule already covers the behavior
- finding prior art in local lint packages or dependency lint libraries
- identifying the TypeSpec compiler surface, decorators, helpers, or metadata APIs a rule should inspect

If the task is specifically about a named LintDiff or `azure-openapi-validator` rule, prefer `/lintdiff-rule-intake` first unless the user is explicitly brainstorming a brand-new native lint.

## Process

1. Restate the request in lint-authoring terms.
2. Inspect the target repository for existing lint packages, registration patterns, helper utilities, diagnostics style, and nearby rules.
3. Check dependencies or adjacent libraries for prior art before proposing new logic.
4. Distinguish between:
   - intended semantics
   - diagnostics and message expectations
   - severity expectations
   - likely false-positive / false-negative risks
   - validation and testability constraints
5. Decide whether existing coverage already exists or whether a new lint still appears justified.
6. End with a rule brief that is ready for `/typespec-lint-implement` or, if the repository already has the rule, `/typespec-lint-validate`.

## Deliverable

Produce a compact brief with these sections:

- Problem statement
- Intended semantics
- Existing coverage or prior art
- Candidate implementation surface
- Candidate diagnostics/messages
- Validation strategy
- Risks and open questions
- Recommended next skill

## Portability rules

- Treat file names, commands, and package paths as repository-specific facts to discover.
- Prefer terms like "local lint package", "sandbox project", and "validation loop" over hardcoded path assumptions.
- If the repository has a special migration harness, mention it as a repository adaptation rather than a universal requirement.

## Example invocations

- `/typespec-lint-discovery reject anonymous response models in the local linter package`
- `/typespec-lint-discovery design a pageable metadata consistency lint for packages/typespec-azure-core`
