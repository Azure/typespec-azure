---
validatorRuleId: SystemDataInPropertiesBag
engine: spectral
tspLints: []
---

# SystemDataInPropertiesBag

**Severity:** error

**Applies to:** Resource Manager (ARM)

systemData must be a top-level property, not nested in the properties bag.

| ID                          | Violation | Description                                    |
| --------------------------- | --------- | ---------------------------------------------- |
| `systemdata-in-properties`  | true      | systemData placed inside properties model      |
