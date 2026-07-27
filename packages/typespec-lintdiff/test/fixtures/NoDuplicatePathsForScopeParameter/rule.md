---
validatorRuleId: NoDuplicatePathsForScopeParameter
engine: spectral
tspLints: []
coverageKind: blocked
---

# NoDuplicatePathsForScopeParameter

**Severity:** error

**Applies to:** Resource Manager (ARM)

Specs should not have both scope parameter paths and explicit subscription/resource group
paths for the same resource.

TypeSpec ARM templates do not generate scope parameter paths, so compliant output is expected.

Treat this case as **blocked / suppression-dependent** locally. The duplicate
scope-path repro depends on a standalone ARM path that already requires
`@azure-tools/typespec-azure-resource-manager/arm-resource-operation`
suppression.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `duplicate-scope-paths` | no | Standard ARM resource without scope parameter paths |
