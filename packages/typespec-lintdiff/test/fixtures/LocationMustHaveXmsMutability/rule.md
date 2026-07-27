---
validatorRuleId: LocationMustHaveXmsMutability
engine: spectral
tspLints: []
coverageKind: template
tspRuleset: resource-manager
---

# LocationMustHaveXmsMutability

**Severity:** warning

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

The `location` property in a resource model must have `x-ms-mutability` set to
`["read", "create"]`. This ensures that once a resource is created, its location cannot be
changed.

## Source-of-truth notes

- Upstream `azure-openapi-validator` registers this as an ARM Spectral warning over
  `$.definitions[*].properties.location`.
- The Spectral function reports when `x-ms-mutability` is missing, not an array, or does not
  contain both `"read"` and `"create"`.
- Upstream tests cover the missing, read-only, create-only, and non-array sad paths, plus the
  compliant `["read", "create"]` case.

## Authorability notes

The previous local `missing-mutability` fixture was not trustworthy migration evidence:

- it was a hand-written non-ARM service
- it validated under an inferred data-plane ruleset
- it required suppressing `@azure-tools/typespec-azure-core/use-standard-operations`

For supported ARM authoring, `Azure.ResourceManager` `TrackedResource` templates emit the shared
resource envelope and already place the required `x-ms-mutability: ["read", "create"]` on the
`location` property. Treat this rule as **template-enforced** locally rather than as a true native
lint gap.

## Test Cases

| ID                        | Violation | Description                                                      |
| ------------------------- | --------- | ---------------------------------------------------------------- |
| `compliant-with-template` | false     | `TrackedResource` emits a compliant `location` property template |
