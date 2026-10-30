# Official TypeSpec migration contract

Use this contract for native-first development and both independent review
checkpoints. It does not execute legacy temporary-rule development or promotion.
Standalone legacy skills keep their source/provenance workflow.

## Semantics and ownership

Apply the existing
[native TypeSpec boundary](../develop-lintdiff-rule/SKILL.md#native-typespec-implementation-boundary)
and
[semantic completeness gate](../develop-lintdiff-rule/SKILL.md#native-semantic-completeness-and-parity-evidence-gate)
as semantic requirements, not commands to create a temporary rule. Investigate
the actual supported native metadata APIs before calling a shape unsupported.
No emitted OpenAPI, emitter callback, JSON/reference parsing, source-text policy
checks or unsafe mutation of the original program belongs in production rules.
Projection must actually evaluate the relevant version-sensitive predicate;
source-location filtering alone is not a universal substitute.

Select ownership before implementation. Azure Core owns cross-service author
policy, Resource Manager owns ARM policy, and TCGC owns SDK-facing/common-name
policy when its SDK semantics are essential. Do not introduce ARM-to-TCGC
dependency inversion or defer an intentional authored/common-SDK-name change
until a nonexistent promotion phase. Preserve actual audience/profile selection,
including explicit RPaaS opt-in and ordinary ARM counterexamples. Skip generic
templates consistently with owning-package conventions.

Keep production logic in the owning official package and reuse coherent native
helpers. Equivalence analysis can use emitted artifacts in the external harness;
those dependencies and comparison-only settings must not leak into the rule.
One group has one native policy, not an arbitrary bundle hidden under one ID.

## Completeness and test design

Use the shared [analysis-first edit loop](analysis-first-lint-migration.md).
Decide changes from semantic analysis and focused regressions; use costly
real-spec coverage at justified checkpoints without weakening final evidence.

Trace every material validator check, valid exception and branch to native
metadata, discriminating tests or an explicitly justified structural prevention.
Keep a separate member matrix for groups. A missing low-frequency member is not
covered by equal aggregate counts. Retain cross-member independent failures and
shared-location distinct-violation tests where authorable. Keep native tests
focused and idiomatic; do not clone comparison fixtures without a native claim.
Unsupported metadata requires evidence from installed APIs/authorable repros,
not a failed first implementation.

Retain fixture ownership, expected rule/noise diagnostics and claim mapping when
reusing legacy repros. Resolve structural prevention and existing-rule coverage
before writing a duplicate lint. A new opt-in native rule must not appear
equivalent because its activation profile was never enabled.

## Packaging, documentation and release readiness

Read the destination's instructions and existing rules before edits. Preserve
diagnostic naming/messages, library wiring, exports and package architecture.
Unless explicitly authorized, keep new rules disabled in recommended/default
policy presets, such as `@azure-tools/typespec-azure-rulesets/resource-manager`.
Library `all` rulesets are independent: preserve their existing automatic
membership convention rather than adding a per-rule exclusion merely because
a rule is new or disabled in a recommended preset. Preserve existing
audience-specific exceptions; a new exception needs its own policy justification.
Verify library `all` activation and recommended-preset nonactivation separately
through existing package/registration tests, not duplicate rule-unit suites.
Update every impacted ruleset's exhaustive enable/disable mapping and tests;
do not assume adding a library rule automatically updates resource-manager
rulesets. Add Chronus metadata for changed packages.

Before publication run focused behavior tests, affected package build/lint and
required package tests, applicable rulesets build/tests, generated rule docs
and formatting, native example compilation with actual expected diagnostics,
and required integration checks. Declare commands and required/supplemental
scope before running. Use destination-native scripts and current exact commands
from [promotion validation](../lintdiff-rule-promote/SKILL.md), without invoking
promotion itself, the temporary fixture harness or its corpus as native gates.
No blanket website build unless a separate requirement makes it necessary;
retain authoritative CI requirements.

Follow [example authoring](../typespec-lint-implement/SKILL.md#example-authoring):
prefer supported standard templates, document an actual limitation before raw
routes, and compile the final incorrect/correct snippets. Explain user-facing
policy natively; put all original Swagger mappings in a dedicated provenance
section. For ARM rules update the manual rule matrix, documentation link,
mapping and impact. Generated docs alone do not add the manual row.

Required real-spec native coverage, diagnostics/count investigations, baseline
and publication receipts belong in external evidence. They supplement, not
replace, native tests and integration. Independent local reviews precede
publication and each GitHub checkpoint; retain same-reviewer follow-up for
material corrections. Required failures, missing evidence or unreviewed changed
semantics prohibit success. Reuse only results whose content/inputs still match.
