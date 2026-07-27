---
validatorRuleId: SystemDataDefinitionsCommonTypes
engine: spectral
tspLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property'
coverageKind: lint
officialTspLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property'
---

# SystemDataDefinitionsCommonTypes

**Severity:** error

**Applies to:** Resource Manager (ARM)

systemData must use the common-types definition.

For ARM-style TypeSpec authoring, `TrackedResource` already emits the common-types
`TrackedResource` schema, and attempts to redefine `systemData` in the resource
envelope are already rejected by existing ARM diagnostics.

## Semantic coverage notes

- The upstream Spectral rule only inspects top-level `systemData`/`SystemData` `$ref` values.
- In TypeSpec ARM authoring, redefining either casing at the resource envelope is already
  rejected by `@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property`
  before the emitted OpenAPI can reach the validator's `$ref` check.
- The uppercase case also triggers `@azure-tools/typespec-azure-core/casing-style`, but the ARM
  envelope diagnostic is the relevant existing coverage for this validator rule.

| ID                                   | Violation | Description                                                                 |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| `compliant-with-template`            | false     | `TrackedResource` emits the common-types `TrackedResource` reference         |
| `custom-top-level-systemdata`        | true      | Lowercase `systemData` override is already blocked by `arm-resource-invalid-envelope-property` |
| `custom-top-level-uppercase-systemdata` | true   | Uppercase `SystemData` override is likewise blocked before a new lint is needed |
