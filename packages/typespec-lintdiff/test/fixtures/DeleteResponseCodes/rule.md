---
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-delete-operation-response-codes'
- '@azure-tools/typespec-azure-resource-manager/no-response-body'
validatorRuleId: DeleteResponseCodes
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-delete-operation-response-codes'
- '@azure-tools/typespec-azure-resource-manager/no-response-body'
---

# DeleteResponseCodes

**RPC Code:** RPC-Delete-V1-01, RPC-Async-V1-09

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Validates that DELETE operations have the correct HTTP response codes:

- **Synchronous DELETE** must have exactly responses `200`, `204`, and `default`.
  No additional response codes are allowed.

- **Long-running (LRO) DELETE** must have exactly responses `202`, `204`, and `default`.
  No additional response codes are allowed.

Additionally:

- An async DELETE (detected by having a `202` response, `x-ms-long-running-operation: true`,
  or `x-ms-long-running-operation-options`) must set `x-ms-long-running-operation: true`.
- The `202` response in an LRO DELETE must not have a response body schema.

## Detection Logic

The rule inspects each DELETE operation's `responses` object:

1. If `responses` is empty → error (must be non-empty).
2. If the operation is async (has `202`, or `x-ms-long-running-operation` is true, or
   `x-ms-long-running-operation-options` exists):
   - Must have `x-ms-long-running-operation: true` set.
   - Must have exactly `[202, 204, default]`.
   - `202` response must not have a `schema`.
3. Otherwise (sync):
   - Must have exactly `[200, 204, default]`.

## Test Cases

| ID                                | Violation            | Description                                  |
| --------------------------------- | -------------------- | -------------------------------------------- |
| `sync-delete-only-200`            | Missing 204, default | Sync delete returns only 200                 |
| `sync-delete-only-204`            | Missing 200, default | Sync delete returns only 204                 |
| `sync-delete-missing-default`     | Missing default      | Sync delete has 200+204 but no default       |
| `sync-delete-extra-response-code` | Extra 202 code       | Sync-looking delete has extra response codes |
| `lro-delete-extra-200`            | Extra 200 code       | LRO delete has 200+202+204+default           |
| `lro-delete-missing-204`          | Missing 204          | LRO delete has 202+default but no 204        |
| `lro-delete-response-body-on-202` | Schema on 202        | LRO delete returns body in 202 response      |
