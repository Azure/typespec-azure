---
validatorRuleId: PatchSkuProperty
engine: spectral
tspLints: []
tspRuleset: resource-manager
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator'
---

# PatchSkuProperty

**Severity:** warning

**Applies to:** Resource Manager (ARM)

If a resource has a sku property, PATCH must include it and it should be optional.

**Classification:** Template-enforced — ARM TypeSpec PATCH operations auto-derive the request body from the resource model via `ResourceUpdateModel<T>`, which includes `sku` when present. The violation requires manual PATCH body construction with raw HTTP ops, which `arm-resource-operation` and `arm-resource-interface-requires-decorator` already flag. See `notes/non-migrated-rules.md` for full rationale.

| ID                | Violation | Description                                       |
| ----------------- | --------- | ------------------------------------------------- |
| `sku-not-optional`| false     | ARM library correctly handles sku in PATCH         |
