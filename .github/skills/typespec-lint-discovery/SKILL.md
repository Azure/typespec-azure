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
4. Define the [native rule contract](#native-rule-contract), distinguishing between:
   - intended semantics
   - diagnostics and message expectations
   - severity expectations
   - likely false-positive / false-negative risks
   - validation and testability constraints
5. Decide whether existing coverage already exists or whether a new lint still appears justified.
6. End with a rule brief that is ready for `/typespec-lint-implement` or, if the repository already has the rule, `/typespec-lint-validate`.

## Native rule contract

Record these decisions in the brief before implementation:

- **Intent and checked concept:** state the authoring guideline independently of
  any serialized format. Identify whether it concerns semantic types, HTTP
  behavior, service-specific metadata, or generated SDK APIs.
- **Supported authoring and exemptions:** identify ordinary compliant and
  violating inputs, relevant templates/customizations, and constructs already
  rejected by other validation. Do not expand the contract just to reach an
  otherwise invalid input.
- **Ownership and applicability:** select the package and ruleset by the checked
  concept, not the source rule's name. Distinguish ruleset audience from actual
  declaration filtering; justify any per-service or namespace guard.
- **Implementation surface:** compare a sibling rule and the supported
  compiler/TypeKit/library APIs. For each proposed custom resolver, traversal, or
  special case, name a supported input that requires it and the test that will
  prove that requirement. Mark unresolved API questions explicitly.
- **Diagnostic contract:** specify the unit (property, operation, model, etc.),
  authored target, expected multiplicity, exemptions, and concise corrective
  message. Extra diagnostics and suppressed duplicates are behavior decisions.
- **Public naming:** use a short native name consistent with sibling rules.
  Define domain terms in user documentation and non-obvious helper contracts.

For naming rules, explicitly distinguish source names, common SDK names,
language-specific overrides, and serialized operation IDs. Select the name
domain required by the guideline instead of assuming those names are equivalent.
For migrations, carry forward evidenced intentional differences from the source
validator; output/count equivalence is a separate claim from guideline coverage.

## Deliverable

Produce a compact brief with these sections:

- Problem statement
- Native rule contract and intentional migration differences, when applicable
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
