---
validatorRuleId: VersionConvention
engine: spectral
tspLints: []
tspRuleset: data-plane
---

# VersionConvention

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

API version should be a date in YYYY-MM-DD format, optionally suffixed
with '-preview'. Using a non-date version like "v1" triggers this rule.

## TypeSpec source notes

The closest native rule is
`@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-version-format`
defined in
`typespec-azure/packages/typespec-azure-resource-manager/src/rules/arm-resource-invalid-version-format.ts`.
That rule walks namespace versions via `getVersion(...)` and validates ARM resource
version strings against the ARM date-format regex.

We do **not** map `VersionConvention` to that rule because this validator rule is
recorded here as a DataPlane rule, while the native TypeSpec rule is ARM-specific.
The current dataplane test also compiles cleanly once ARM ambient lints are removed,
which confirms there is no corresponding dataplane-native format check in our current
TypeSpec toolchain.

## Test Cases

| ID                     | Violation | Description                                         |
| ---------------------- | --------- | --------------------------------------------------- |
| `non-date-version`     | true      | API version uses a non-date value (`v1`)            |
