---
engine: native
tspLints:
- '@azure-tools/typespec-azure-resource-manager/no-resource-delete-operation'
validatorRuleId: AllTrackedResourcesMustHaveDelete
coverageKind: lint
---

# AllTrackedResourcesMustHaveDelete

**Severity:** error

**Applies to:** Resource Manager (ARM)

All tracked resources must have a delete operation defined.

## Source-of-truth notes

- Upstream registers `AllTrackedResourcesMustHaveDelete` as a native ARM rule that
  calls `allResourcesHaveDelete` with `isTrackedResource: true`.
- The validator's ARM helper classifies tracked resources by resolving the response
  schema and checking for an inherited `location` property.
- The local ARM lint `@azure-tools/typespec-azure-resource-manager/no-resource-delete-operation`
  catches the authorable TypeSpec case directly.

## Current outcome

- The previous local v5 fixture was a **test-quality issue**: this repository only
  bundles ARM common-types v3 for validator ref resolution, so the native validator
  could not follow the emitted v5 `TrackedResource` ref and stayed silent.
- Switching the fixture to common-types v3 restores the validator repro without any
  extra local OpenAPI extension hack.
- With that repair, both the validator and
  `@azure-tools/typespec-azure-resource-manager/no-resource-delete-operation` fire on
  `missing-delete`, so the current migration classification is **already covered**.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-delete` | yes | TrackedResource with get + createOrUpdate but no delete |
