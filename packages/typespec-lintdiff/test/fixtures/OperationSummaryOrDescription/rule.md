---
validatorRuleId: OperationSummaryOrDescription
engine: spectral
tspLints:
  - "@azure-tools/typespec-azure-core/documentation-required"
---

# OperationSummaryOrDescription

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Validates that every operation has a `summary` or `description` field. Operations without
either are harder to understand in generated documentation and client SDKs.

## Detection Logic

The rule inspects each operation in the swagger:

1. If neither `summary` nor `description` is present → warning.

## Test Cases

| ID                              | Violation              | Description                                                   |
| ------------------------------- | ---------------------- | ------------------------------------------------------------- |
| `operation-missing-description` | No summary/description | Operations defined without @doc decorator                     |
