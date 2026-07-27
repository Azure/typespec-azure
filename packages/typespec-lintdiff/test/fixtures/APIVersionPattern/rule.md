---
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-version-format'
validatorRuleId: APIVersionPattern
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-version-format'
---

# APIVersionPattern

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

API version strings must match the pattern `YYYY-MM-DD` optionally followed by `-preview`.

## TypeSpec source notes

This mapping is source-backed by
`typespec-azure/packages/typespec-azure-resource-manager/src/rules/arm-resource-invalid-version-format.ts`.
That rule walks the version map for an ARM namespace and validates each version string
against the ARM date-format regex `YYYY-MM-DD[-suffix]`.

This is the ARM-specific analogue of the validator rule. The related DataPlane rule
`VersionConvention` remains unmapped because the ARM native rule does not apply there.

## Test Cases

| ID                       | Violation                    | Description                                               |
| ------------------------ | ---------------------------- | --------------------------------------------------------- |
| `invalid-version-format` | Invalid API version format   | Version enum uses "v1.0" instead of YYYY-MM-DD format     |
