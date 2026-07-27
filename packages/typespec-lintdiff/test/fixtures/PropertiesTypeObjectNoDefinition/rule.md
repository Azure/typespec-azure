---
validatorRuleId: PropertiesTypeObjectNoDefinition
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-resource-manager/no-empty-model'
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/no-empty-model'
---

# PropertiesTypeObjectNoDefinition

**Severity:** error

**Applies to:** Resource Manager (ARM)

Properties with `type: object` must have a proper definition or `$ref`.

| ID                        | Violation | Description                                     |
| ------------------------- | --------- | ----------------------------------------------- |
| `untyped-object-property` | true      | Property uses an anonymous empty object model |
