---
validatorRuleId: OperationsApiSchemaUsesCommonTypes
engine: spectral
tspLints:
  - 'tsp-lintdiff-local-linter/operations-api-schema-uses-common-types'
coverageKind: lint
---

# OperationsApiSchemaUsesCommonTypes

**Severity:** error

**Applies to:** Resource Manager (ARM)

**RPC code:** RPC-Operations-V1-01

## Description

The provider operations API (`GET /providers/<namespace>/operations`) must return the
common-types `OperationListResult` schema. A service-defined list result is a violation.

## Source-of-truth notes

- Upstream `azure-openapi-validator` registers this as the ARM Spectral rule
  `OperationsApiSchemaUsesCommonTypes` with severity `error` and `resolved: false`.
- Selector: `$[paths,'x-ms-paths'][?(@property.match(/\/providers\/\w+\.\w+\/operations$/i))].get.responses.200.schema.$ref`
- The `$ref` must match
  `.*/common-types/resource-management/v\d+/types.json#/definitions/OperationListResult`.
- Because the selector runs unresolved, only the literal `$ref` string matters; a
  structurally identical service-defined model is still a violation.

## TypeSpec source notes

Two distinct authorable shapes emit a violating operations path:

1. **No standard Operations interface + hand-written route.** A service drops
   `interface Operations extends Azure.ResourceManager.Operations {}` and hand-writes
   `@route("/providers/<ns>/operations")`. TypeSpec already reports
   `@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint` here, so
   this shape is **already covered** — a new lint would be redundant for it.
2. **`Azure.ResourceManager.Legacy.Operations<Response>` with a custom response.** The
   legacy template parameterizes the response, so a service can emit
   `/providers/<ns>/operations` returning a service-defined list result. This shape
   satisfies `missing-operations-endpoint` and TypeSpec emits **no diagnostics at all**.
   This is the clean native-lint gap and the reason this rule was migrated.

## Semantic coverage notes

The native rule targets only shape 2 semantics but fires on both, matching the validator:
any ARM `GET` whose route ends in `/providers/<...>/operations` must return a model that
is both named `OperationListResult` and marked as an ARM common type
(`@armCommonDefinition`, checked via `isArmCommonType`).

Deliberate parity deltas:

- The validator matches the emitted `$ref` string; the native rule matches the TypeSpec
  type identity. A service that re-declares its own model literally named
  `OperationListResult` without `@armCommonDefinition` is caught by both.
- The validator's path regex requires a literal `Namespace.Name` provider segment. The
  native rule matches `/providers/<any-single-segment>/operations` because the provider
  segment is still a `{provider}` path parameter before the ARM emitter substitutes it.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `custom-operations-schema` | false | Standard ARM service using `Azure.ResourceManager.Operations` (compliant) |
| `custom-operations-list-result` | true | Hand-written `/providers/<ns>/operations` route returning a service-defined list result |
| `legacy-operations-custom-response` | true | `Legacy.Operations<ArmResponse<CustomOpListResult>>` — clean gap, no TypeSpec diagnostics before this rule |
