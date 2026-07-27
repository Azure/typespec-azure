---
validatorRuleId: InvalidSkuModel
engine: spectral
tspLints: []
---

# InvalidSkuModel

**Severity:** warning

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

If a resource has a `sku` property, the Sku model must include a required `name` property.
A Sku model without a `name` field is considered invalid.

## Source-of-truth notes

- Upstream `azure-openapi-validator` registers this as the ARM Spectral rule
  `InvalidSkuModel` with severity `warn`.
- The Spectral selector targets schema definitions named `Sku`.
- The implementation accepts only these case-insensitive property names:
  `name`, `tier`, `size`, `family`, and `capacity`.
- A `Sku` definition is invalid when:
  - `name` is missing
  - `name` exists but is not a string
  - any other property is present
- Upstream unit tests cover three core branches:
  - missing `name` => violation
  - extra property => violation
  - allowed property set with string `name` => compliant

## TypeSpec source notes

The current repo can reproduce the validator behavior only by authoring a custom
top-level ARM resource `sku` envelope property and suppressing
`@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property`.

That prerequisite lint already rejects the authoring shape before a dedicated
native `InvalidSkuModel` lint would matter. The validator violation is therefore
real in the comparison harness, but it is **blocked / suppression-dependent**
rather than a clean native-lint gap.

Standard ARM template-driven authoring is already safe here because the normal
resource-manager patterns do not require this custom top-level `sku` repro.

## Semantic coverage notes

The authorable matrix represented locally is:

- custom top-level `sku` without `name` => violation, suppression-dependent
- custom top-level `sku` with extra property => violation, suppression-dependent
- custom top-level `sku` with non-string `name` => violation, suppression-dependent
- custom top-level `sku` with only allowed properties and string `name` =>
  compliant, but still suppression-dependent

Ignored upstream implementation branches such as null or non-object schemas are
not directly authorable from TypeSpec models in this harness.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-sku-name` | true | Custom top-level ARM `sku` omits the required `name` property |
| `extra-sku-property` | true | Custom top-level ARM `sku` adds a non-standard `extra` property |
| `non-string-sku-name` | true | Custom top-level ARM `sku` uses a non-string `name` property |
| `valid-sku-model` | false | Custom top-level ARM `sku` uses only allowed properties with string `name` |
