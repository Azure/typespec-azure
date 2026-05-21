---
title: When to Write a Linting Rule vs. Defer to AI Tooling
---

This guidance helps authors decide whether a given Azure API design guideline should be
implemented as a deterministic linting rule, deferred to AI authoring/validation tools, or
addressed with a hybrid approach.

## Core Principle

> Prefer deterministic linting when the guideline can be expressed as a stable, reproducible
> check with high confidence and actionable diagnostics. Prefer AI when the guideline requires
> semantic judgment, domain intent, content generation, or evaluation of qualitative adequacy.
> Use hybrid approaches when deterministic rules can identify objective gaps and AI can help
> interpret, prioritize, or remediate them.

The decision to create a linting rule hinges primarily on **determinism of detection** — can you
reliably identify violations with low false positives? Whether the _resolution_ requires judgment
is a separate question that determines whether the rule is standalone or hybrid, not whether it
should exist.

## How Linter Diagnostics Work

All linter rules emit diagnostics with **warning** severity. This is important to understand:

- **Warnings** are suppressible — authors can add a suppression comment with justification
- **Unsuppressed warnings block CI** — the compiler treats unsuppressed diagnostics as errors
  during validation
- **Errors** (non-linter) indicate inconsistent or uncompilable code and are _never_ suppressible

Linter rules are never classed as errors because they enforce design guidelines, not language
correctness. The suppression mechanism exists precisely because even high-confidence rules
occasionally have legitimate exceptions that require human judgment.

## The Two Axes of Decision

When evaluating whether a guideline should become a linting rule, consider two independent
questions:

1. **Can violations be detected deterministically with high fidelity?** (detection axis)
2. **Can violations be resolved without contextual judgment?** (resolution axis)

These combine into three categories:

| Detection                          | Resolution                 | Approach                                                |
| ---------------------------------- | -------------------------- | ------------------------------------------------------- |
| Deterministic, low false positives | Unambiguous or few options | **Standalone linting rule** — detects and may offer fix |
| Deterministic, low false positives | Requires judgment/context  | **Hybrid** — rule detects, AI assists resolution        |
| Requires semantic judgment         | Requires judgment/context  | **Defer to AI tooling**                                 |

The key insight: **detection determinism decides whether a rule should exist.** Resolution
complexity decides whether it needs AI assistance, not whether it's worth building.

## Create a Linting Rule When

These criteria all relate to the **reliability of detection**:

### 1. The violation is mechanically identifiable from the AST

You can write a predicate over the TypeSpec syntax tree that reliably identifies violations. The
check relies on structural or syntactic properties, not on understanding what the API means.

- ✅ _"No resource type should use the suffix 'Resource'"_ — name check
- ✅ _"All operations must have an api-version parameter"_ — parameter presence check
- ✅ _"Enums must use the extensible pattern"_ — structural pattern check

### 2. False positive rate is very low

The rule should almost never flag code that is actually correct. If you cannot distinguish
violations from valid patterns mechanically, the rule will produce noise that erodes author trust
in the linter.

### 3. Exceptions are rare and handleable via suppression

The guideline doesn't need to be exceptionless. Linter warnings are suppressible by design. A
rule is appropriate as long as exceptions are infrequent enough that suppression is a reasonable
mechanism (not a routine annoyance).

### 4. The diagnostic is actionable

The author can understand _what's wrong_ from the diagnostic message. They may or may not know
how to fix it without help — that determines standalone vs. hybrid, not whether the rule should
exist.

### 5. Speed of feedback matters

Linting rules provide instant, in-editor feedback. For guidelines where catching violations early
prevents expensive rework, deterministic detection is strongly preferred over async AI review.

## Defer to AI Tooling When

These criteria indicate that **detection itself requires judgment**:

### 1. Identifying the violation requires semantic or domain understanding

The guideline's applicability depends on what the API _means_, not just its structural shape. No
AST predicate can reliably determine whether the code violates the guideline.

- 🤖 _"Resource types should have clear, concise names"_ — "clear" depends on domain context
- 🤖 _"Choose appropriate HTTP methods for operations"_ — requires understanding intent
- 🤖 _"Model structure should reflect the resource lifecycle"_ — requires domain modeling judgment

### 2. Detection would produce unacceptable false positives

If the mechanical proxy for the guideline would flag many valid patterns, it should not be a
linting rule. Authors trained to suppress noise will also suppress legitimate findings.

### 3. The guideline evaluates subjective quality

Assessing whether something is _good enough_ rather than _present or structurally correct_ is
inherently non-deterministic.

- 🤖 _"Documentation is clear, accurate, and useful"_
- 🤖 _"The API surface is ergonomic for the target scenarios"_
- 🤖 _"Naming clearly communicates purpose to consumers"_

## Hybrid Approach: Deterministic Detection + AI-Assisted Resolution

This is the middle ground where a linting rule _should_ exist because detection is reliable, but
the **fix** requires contextual judgment. The rule identifies the problem; AI helps solve it.

| Pattern                   | Rule Detects (deterministic) | AI Assists (judgment)                  |
| ------------------------- | ---------------------------- | -------------------------------------- |
| **Missing documentation** | `@doc` decorator absent      | Generates appropriate text             |
| **Naming violation**      | Suffix/prefix/casing wrong   | Suggests contextually appropriate name |
| **Missing pagination**    | List operation lacks paging  | Helps structure the paging model       |
| **Overly broad type**     | `Record<unknown>` used       | Suggests appropriate typed alternative |

**Why the rule still matters in hybrid cases:**

- It provides a structured, reliable signal that AI tools can consume
- It ensures the issue is never silently ignored (unsuppressed warnings block CI)
- It gives instant in-editor feedback even when AI tools aren't active
- It makes the guideline auditable — you can count violations, track suppressions, measure
  compliance

## Anti-Patterns to Avoid

### ❌ Skipping a rule because the fix is hard

If detection is reliable, create the rule even if the fix requires judgment. The hybrid pattern
exists for exactly this case. A diagnostic that says "this model uses `Record<unknown>`, which
limits SDK usability" is valuable even without an auto-fix.

### ❌ Rules whose easiest fix is meaningless mechanical compliance

If the rule incentivizes authors to add useless placeholders (e.g., `@doc("The Foo property")`)
just to silence the warning, the rule needs complementary AI review of content quality. The rule
is still worth having — it catches _absence_ — but it shouldn't be the only check.

### ❌ Rules encoding service-specific policy as universal Azure policy

A pattern that's wrong for one service may be correct for another. Universal rules should reflect
truly universal guidelines.

### ❌ Rules that require expensive whole-program or cross-version analysis

If the rule needs to compare against previous API versions or analyze the entire spec graph, it
may be too expensive for real-time editor feedback. Consider running such checks only in CI
rather than in-editor.

### ❌ AI as the sole enforcement for consistently-applied guidelines

AI validation is non-deterministic and hard to audit. If a guideline must be reproducibly
enforced across all services, a deterministic rule (even a simple structural proxy) provides the
necessary backstop.

## Decision Framework

| Factor                      | Favors Linting Rule            | Favors AI Tooling                      |
| --------------------------- | ------------------------------ | -------------------------------------- |
| **Detection reliability**   | AST predicate, high confidence | Requires semantic understanding        |
| **False positive rate**     | Very low                       | Moderate to high                       |
| **Knowledge for detection** | Local structural/syntactic     | Domain, historical, or cross-service   |
| **Speed importance**        | Critical (in-editor feedback)  | Async/advisory acceptable              |
| **Guideline maturity**      | Well-established, stable       | Evolving, subjective                   |
| **Auditability need**       | Must track compliance          | Advisory is sufficient                 |
| **Maintenance cost**        | Simple AST check, stable APIs  | Complex inference, frequent exceptions |

Note: **fix complexity does not appear in this table** — it affects whether the rule is
standalone or hybrid, not whether it should exist.

## Rollout Considerations

When a new rule produces diagnostics on existing specs, each violation must be individually
addressed before the rule can ship in a ruleset. All rules in a ruleset apply universally to all
specs that ruleset covers — there is no mechanism to exempt individual specs from specific rules.

For each existing violation, the author must decide:

1. **Fix the violation** (preferred) — If the fix is API-neutral (doesn't require
   service-specific knowledge and doesn't meaningfully change downstream artifacts), apply the
   fix directly.

2. **Suppress with FIXME** — If the violation cannot be fixed without service-specific knowledge
   or would cause meaningful downstream changes, suppress it with a FIXME comment indicating why
   and what would be needed to resolve it.

The External Integration check (`int:azure-specs`) identifies which existing specs produce new
diagnostics. See the [Creating Linter Rules](./creating-linter-rules.md) guide for the workflow
of submitting spec fixes alongside linter rule PRs.

## Summary Flowchart

```text
Can the violation be identified from AST/structure alone?
├── No → Defer to AI tooling
└── Yes → Would it produce high false positives?
    ├── Yes → Defer to AI tooling
    └── No → CREATE A LINTING RULE ✅
        └── Can the fix be applied without contextual judgment?
            ├── Yes → Standalone rule (may include code fix)
            └── No → Hybrid: rule detects, AI assists resolution
```
