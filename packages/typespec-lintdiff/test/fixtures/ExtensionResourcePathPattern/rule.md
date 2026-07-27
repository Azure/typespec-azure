---
validatorRuleId: ExtensionResourcePathPattern
engine: native
coverageKind: lint
tspLints:
  - tsp-lintdiff-local-linter/extension-resource-path-pattern
tspRuleset: resource-manager
---

# ExtensionResourcePathPattern

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Native

## Description

Extension resources should use the `{scope}` pattern rather than hardcoding
the parent scope. TypeSpec ARM extension resource templates produce
correct scope-based paths.

## Source-of-truth notes

- Upstream defines `ExtensionResourcePathPattern` as a native validator rule
  (`packages/rulesets/src/native/legacyRules/ExtensionResourcePathPattern.ts`)
  over RPaaS paths.
- The implementation reports any OpenAPI path containing more than one
  `/providers/` segment.
- Upstream docs require extension resources to use
  `{scope}/providers/<namespace>/<type>/<name>` instead of hardcoding the
  parent resource URI.

## Semantic coverage notes

- hardcoded parent ARM extension path with two `/providers/` segments =>
  violation
- scope-based extension path with a single `/providers/` segment => compliant

The original local error-only report was a **test-quality issue**: the focused
validation harness always ran native validator rules with `OpenApiTypes.arm`,
which kept this RPaaS-only validator rule silent. After correcting that local
evidence, the violating fixture reproduces cleanly with no prerequisite
TypeSpec diagnostics, so this rule is a true local lint gap and now has direct
native coverage via `tsp-lintdiff-local-linter/extension-resource-path-pattern`.

## Test Cases

| ID                          | Violation | Description                                               |
| --------------------------- | --------- | --------------------------------------------------------- |
| `incorrect-extension-path`  | true      | ARM extension path hardcodes the parent scope             |
| `scope-based-extension-path`| false     | ARM extension path uses `{scope}/providers/...` correctly |
