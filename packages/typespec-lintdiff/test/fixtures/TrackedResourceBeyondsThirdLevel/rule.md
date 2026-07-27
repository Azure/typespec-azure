---
engine: native
tspLints:
- '@azure-tools/typespec-azure-resource-manager/beyond-nesting-levels'
validatorRuleId: TrackedResourceBeyondsThirdLevel
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/beyond-nesting-levels'
---

# TrackedResourceBeyondsThirdLevel

**Severity:** error

**Applies to:** Resource Manager (ARM)

Tracked resources should not be nested beyond the third level.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `deep-nesting` | yes | TrackedResource nested 4 levels deep |
