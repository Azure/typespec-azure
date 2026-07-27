---
validatorRuleId: PutRequestResponseSchemeArm
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/put-request-response-scheme-arm
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response'
coverageKind: lint
officialTspLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response'
tspRuleset: resource-manager
---

# PutRequestResponseSchemeArm

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

PUT request body schema must match the `200` response schema, or the `201`
response schema when no `200` exists.

## Source-of-truth notes

- Upstream ARM and data-plane rules share the same Spectral function: compare the
  PUT request body schema to `200`, then fall back to `201`.
- The actual upstream semantic matrix is defined by the implementation plus ARM
  unit tests:
  - mismatch against `200` => violation
  - mismatch against `201` when `200` is absent => violation
  - matching request/response schemas => compliant
  - empty `x-ms-arm-id-details: {}` on an otherwise-equal schema => compliant

## Semantic coverage notes

- The repository now adds `tsp-lintdiff-local-linter/put-request-response-scheme-arm`
  to compare ARM PUT request bodies against the emitted `200`/fallback `201`
  success schema directly in authorable TypeSpec.
- The official ARM lint
  `@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response`
  still overlaps when the response resource schema itself diverges across PUT,
  GET, PATCH, and LIST, but it does **not** catch request-only mismatches where
  all success responses still return the canonical resource model.
- The full upstream matrix is now represented locally with clean ARM authoring:
  - PUT request matches the ARM resource response => compliant
  - PUT request differs from `200` response => local lint violation
  - PUT request differs from fallback `201` response => local lint violation
  - empty `x-ms-arm-id-details: {}` does not affect equality => compliant

Treat this rule as **direct/native lint coverage** now, with the official ARM
lint retained as corroborating overlap for the response-mismatch subset.

## Test Cases

| ID          | Violation | Description                                          |
| ----------- | --------- | ---------------------------------------------------- |
| `compliant` | false     | Standard ARM resource templates emit matching PUT request/response schemas |
| `arm-resource-mismatch` | true | Custom ARM createOrUpdate returns a different ARM resource model; both the new local lint and the official ARM response lint fire |
| `arm-resource-mismatch-201` | true | ARM createOrUpdate only returns `201`, and that fallback schema differs from the PUT request body |
| `request-body-mismatch-response-match` | true | ARM createOrUpdate keeps the canonical response model but accepts a different request model; this is the authorable gap filled by the new local lint |
| `empty-arm-id-details` | false | Empty `x-ms-arm-id-details: {}` metadata does not break schema equality |
