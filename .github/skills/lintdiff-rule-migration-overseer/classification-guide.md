# Migration classification guide

Use these categories consistently when reporting a migration outcome.

## Covered

A native TypeSpec lint or equivalent repository-native diagnostic already covers the validator rule strongly enough that new lint work is unnecessary.

## Template-enforced

The violating shape is prevented by templates, framework helpers, or generated conventions, so a dedicated native lint is not the main control.

## Blocked or suppression-dependent

The local repro only works by suppressing unrelated TypeSpec diagnostics, or another existing diagnostic already forbids the shape. This is not a clean signal that a brand-new native lint is needed.

## Partial

A native rule exists or can exist, but the current evidence shows intentional or unavoidable mismatches in scope.

## True gap

The validator rule fires, the violating shape is authorable without prerequisite blocking evidence, and no existing native coverage explains the behavior. This is the strongest case for new lint work.

## Test-quality issue

The fixture or validation flow is not trustworthy enough yet to support a migration decision. Fix the evidence before deciding on a native lint.
