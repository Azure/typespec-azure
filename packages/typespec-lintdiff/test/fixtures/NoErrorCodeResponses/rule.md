---
validatorRuleId: NoErrorCodeResponses
engine: spectral
tspLints:
  - "tsp-lintdiff-local-linter/no-error-code-responses"
  - "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes"
officialTspLints:
  - "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes"
coverageKind: lint
---

# NoErrorCodeResponses

**Severity:** error

**Applies to:** Resource Manager (ARM)

Operations should not define response codes outside the ARM allowed set of `200`,
`201`, `202`, `204`, and `default`. Errors should be represented using the default
response only.

TypeSpec ARM templates use default error responses and do not generate explicit error
status codes, so compliant output is expected. For the local wave-A POST action repro,
`@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes` is the direct
native signal that the explicit `404` response is not allowed. The local rule still
checks all ARM endpoints because the intended status policy applies across HTTP
methods, while official POST response-code coverage does not. The Swagger rule
selects response keys under `paths` only; the native rule also covers endpoints
emitted under `x-ms-paths`. TypeSpec status-code ranges such as `300..399` emit
grouped Swagger response keys such as `3XX`, which are also outside the validator's
allowed set.

## Native contract and promotion

The rule uses `getAllHttpServices`, like the sibling `put-in-operation-name`
rule, to inspect concrete HTTP endpoints rather than generic operation declarations
or their non-endpoint template instances. Each disallowed HTTP response status
produces one diagnostic on the concrete operation, including inherited interface
operations and aliases. Multiple payload variants sharing a status are one HTTP
response; different disallowed statuses remain independently actionable.
Endpoint-level suppressions therefore do not leave warnings on source templates.

`getArmProviderNamespace` walks ancestors to include nested provider namespaces.
This guard isolates ARM services in lintdiff's mixed ARM/data-plane runner; it
is not part of the response-status policy. Promotion to the ARM-only library
should remove this infrastructure guard and test direct enablement without it.
No emitter, OpenAPI extension, SDK metadata, reference-string inference, or
version mutation participates in production decisions.

### Supported-shape evidence

| Authored shape                                      | Validity and selected Swagger response key | Validator result        | Native result and evidence                                       |
| --------------------------------------------------- | ------------------------------------------ | ----------------------- | ---------------------------------------------------------------- |
| Literal 200, 201, 202, 204                          | Supported exact key                        | Allowed                 | Native allowed-status tests                                      |
| Default ARM error model                             | Supported `default`                        | Allowed                 | `default-error-response` fixture and native test                 |
| Literal 203, 206, 302, 400, 404, 500                | Supported exact key                        | Disallowed              | Native literal matrix; 302/404 fixtures                          |
| Numeric ranges 200–299, 300–399, 400–499            | Supported grouped `2XX`, `3XX`, `4XX` keys | Disallowed              | Native range matrix; `status-code-range` comparison proves `3XX` |
| Singleton numeric range 200–200                     | Supported exact 200                        | Allowed                 | Native singleton test                                            |
| Inherited/spread status metadata and union payloads | Supported; one key per resolved status     | Disallowed once per key | Native inherited/spread test asserts 404 and 500                 |
| Concrete operation aliases and inherited interfaces | Supported endpoint responses               | Disallowed on endpoint  | Native template and interface tests assert count and target      |
| Non-endpoint generic declarations/instances         | No independently emitted path              | Not selected            | Native template test excludes them                               |
| Data-plane endpoint                                 | Valid but outside ARM rule audience        | ARM rule not selected   | Native applicability test                                        |

The native suite imports no emitter and rejects attempts to load AutoRest or
TCGC. It also exercises a standard `ArmResourceRead` response customization.
Corpus overlap is observational evidence, not proof of untested emission shapes
or historical version projections.

Exact Swagger parity is partial: SDK-scoped concrete endpoints remain native
endpoints even when AutoRest excludes them, and `x-ms-paths` endpoints are not
skipped merely because the Swagger selector omits them. The two corpus count
differences and their source/emission evidence are documented in `migration.md`.

## Test Cases

| ID                          | Violation | Description                                                              |
| --------------------------- | --------- | ------------------------------------------------------------------------ |
| `explicit-error-codes`      | yes       | ARM resource action with an explicit `404` response                      |
| `nested-provider-namespace` | yes       | Nested provider namespace operation with an explicit `302` response      |
| `status-code-range`         | yes       | ARM resource action with a `300..399` response range                     |
| `default-error-response`    | no        | ARM resource action with only a `200` success and default error response |
