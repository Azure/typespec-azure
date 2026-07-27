---
validatorRuleId: UnSupportedPatchProperties
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/unsupported-patch-properties
coverageKind: lint
---

# UnSupportedPatchProperties

**Severity:** error

**Applies to:** Resource Manager (ARM)

PATCH body must not contain writable id, name, or type properties.

This rule is now covered by
`tsp-lintdiff-local-linter/unsupported-patch-properties`, which reports
top-level PATCH body properties `id`, `name`, and `type`.

| ID                    | Violation | Description                                |
| --------------------- | --------- | ------------------------------------------ |
| `patch-with-id-name`  | true      | PATCH body includes id and name properties |
