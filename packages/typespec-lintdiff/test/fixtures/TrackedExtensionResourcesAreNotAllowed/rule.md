---
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property'
validatorRuleId: TrackedExtensionResourcesAreNotAllowed
---

# TrackedExtensionResourcesAreNotAllowed

**Severity:** error

**Applies to:** Resource Manager (ARM)

Extension resources must not be tracked (must not have location property).

| ID                   | Violation | Description                                    |
| -------------------- | --------- | ---------------------------------------------- |
| `tracked-extension`  | true      | Extension resource with location property      |
