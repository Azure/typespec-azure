---
validatorRuleId: PatchPropertiesCorrespondToPutProperties
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/consistent-patch-properties
coverageKind: lint
---

# PatchPropertiesCorrespondToPutProperties

**Severity:** error

**Applies to:** Resource Manager (ARM)

PATCH body properties must correspond to properties in the PUT resource model.

The local lint `tsp-lintdiff-local-linter/consistent-patch-properties` provides the native
backstop for this authorable ARM case by recursively comparing PATCH body properties to the
resource model and reporting properties that are missing or moved to a different nesting level.

| ID                    | Violation | Description                                             |
| --------------------- | --------- | ------------------------------------------------------- |
| `patch-extra-property`| true      | PATCH body has property not in PUT resource model        |
