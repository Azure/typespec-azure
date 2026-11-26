# Migration classification guide

Use these categories consistently when reporting a migration outcome.

## Covered

A native TypeSpec lint or equivalent repository-native diagnostic already covers the validator rule strongly enough that new lint work is unnecessary.

Apply the [existing-rule coverage contract](SKILL.md#existing-rule-coverage-contract):
prove the scope and activation, and add the validator mapping to the owning
existing rule's documentation when a duplicate is omitted. No new lint does not
mean no documentation work.

Coverage must enforce the derived semantic TypeSpec guideline. An emitter
omitting an extension or a lint banning raw `@extension` does not establish
coverage of the corresponding semantic authoring check.

## Template-enforced

The native semantic violation is prevented by templates or framework helpers, so
a dedicated native lint is not the main control. Normalizing generated Swagger
while still accepting that native violation is not structural prevention.

## Blocked or suppression-dependent

The local repro only works by suppressing unrelated TypeSpec diagnostics, or another existing diagnostic already forbids the shape. This is not a clean signal that a brand-new native lint is needed.

## Partial

A native rule exists or can exist, but the current evidence shows intentional or unavoidable mismatches in scope.

Name the covered and uncovered checks. Evaluate an extension of the existing
rule before a separate lint, but do not broaden its intent or audience merely
to reproduce Swagger output/counts. Document partial coverage honestly.

## True gap

The original validator establishes the guideline, its similar native semantic
violation is authorable without prerequisite blocking evidence, and no existing
native coverage enforces the check. A raw `@extension` reproducer does not
establish this classification.

## Test-quality issue

The fixture or validation flow is not trustworthy enough yet to support a migration decision. Fix the evidence before deciding on a native lint.
