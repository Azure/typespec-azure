---
validatorRuleId: ConsistentPatchProperties
engine: spectral
tspLints:
- tsp-lintdiff-local-linter/consistent-patch-properties
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-patch'
---

# ConsistentPatchProperties

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

PATCH request body properties must be consistent with the resource model. The PATCH body
should not contain properties that are not present in the resource definition.

The local lint checks the PATCH body shape against the ARM resource model recursively and reports
properties that are missing from the resource model or moved to a different nesting level.

## Semantic coverage notes

- The official `@azure-tools/typespec-azure-resource-manager/arm-resource-patch` lint partially
  overlaps by checking top-level PATCH properties, but it does not recursively validate nested
  properties or enforce the same property level.
- The upstream spectral rule also has a noisy tracked-resource case when the resource envelope is
  inherited from external common-types references; that false-positive cell is not used as a local
  source-of-truth fixture.
- The authorable matrix covered here is:
  - nested PATCH property missing from the resource model => invalid
  - PATCH property present in the resource model but at a different level => invalid
  - PATCH property subset at the same level => valid
  - async PATCH with only `202` and GET fallback to the resource model => valid

## Test Cases

| ID                        | Violation | Description |
| ------------------------- | --------- | ----------- |
| `inconsistent-patch`      | yes       | PATCH places `displayName` at the top level even though the resource model nests it under `properties` |
| `nested-extra-property`   | yes       | PATCH adds `properties.extraPatchOnly`, which does not exist in the resource model |
| `same-level-subset`       | no        | PATCH updates only `properties.description`, which is a valid subset of the resource model |
| `async-get-fallback`      | no        | PATCH has only a `202` response, so the validator falls back to the GET resource model |
