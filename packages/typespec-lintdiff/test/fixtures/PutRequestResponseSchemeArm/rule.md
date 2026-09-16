---
validatorRuleId: PutRequestResponseSchemeArm
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/put-request-response-scheme-arm
  - "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response"
coverageKind: lint
officialTspLints:
  - "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response"
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
  to compare ARM PUT request body types against the native `200`/fallback `201`
  success body types directly in authorable TypeSpec.
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

Union comparison uses native variant types, not compiler-generated symbol keys,
for unnamed members. Separately declared named open unions with the same
members are equivalent even when their unnamed members are reordered. Named
variants retain name-and-type matching, and unnamed matches are one-to-one.
Enum-member types retain their labels and compare their effective values, so
the same label with different string or numeric values does not match.
Direct enum types use the same member comparison: an implicit string default
and an explicit value equal to that member's name match. Numeric zero and empty
strings remain explicit values rather than falling back to the name.
Matching indexers do not bypass named-property comparison: property types,
optionality, counts, and inherited properties still matter. Scalar comparison
checks the name at each level of the base chain, so same-named scalar declarations
cannot hide incompatible underlying types.
Native regression tests in `test/rules/put-request-response-scheme.test.ts`
cover both ARM and data-plane consumers without importing an emitter, including
different members, recursive models, response precedence, and absent bodies.
The OpenAPI library is registered only to satisfy transitive test-host imports;
these tests do not use OpenAPI decorators or helpers.

Indexer-bearing named models are native-authorable. ARM's independent
`arm-no-record` warning discourages this shape for new APIs but explicitly
permits suppression to match existing APIs; it is not a compiler prohibition.
The equality rule must still compare the named properties for such legacy APIs.

The `equivalent-open-unions` comparison fixture intentionally differs from
Swagger: its `RequestState` and `ResponseState` definitions have identical
native members, but different emitted `x-ms-enum.name` values. The validator
compares that SDK metadata too; the native rule does not predict emitter names.
Its one validator diagnostic is explicitly reviewed, not treated as a missing
native check. The custom request resource's unrelated missing-PUT warning is
also explicitly recorded as ambient fixture evidence.

## Test Cases

| ID                                     | Violation | Description                                                                                                                                          |
| -------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compliant`                            | false     | Standard ARM resource templates emit matching PUT request/response schemas                                                                           |
| `arm-resource-mismatch`                | true      | Custom ARM createOrUpdate returns a different ARM resource model; both the new local lint and the official ARM response lint fire                    |
| `arm-resource-mismatch-201`            | true      | ARM createOrUpdate only returns `201`, and that fallback schema differs from the PUT request body                                                    |
| `request-body-mismatch-response-match` | true      | ARM createOrUpdate keeps the canonical response model but accepts a different request model; this is the authorable gap filled by the new local lint |
| `empty-arm-id-details`                 | false     | Empty `x-ms-arm-id-details: {}` metadata does not break schema equality                                                                              |
| `no-request-body`                      | false     | PUT operations without an emitted request body are skipped because the Swagger rule has no request schema to compare                                 |
| `equivalent-open-unions`               | false     | Separate equivalent named open unions match natively; the validator's SDK enum-name mismatch is an intentional parity gap                            |
