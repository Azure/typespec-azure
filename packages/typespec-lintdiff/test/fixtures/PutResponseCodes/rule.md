---
validatorRuleId: PutResponseCodes
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-put-operation-response-codes'
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/arm-put-operation-response-codes'
---

# PutResponseCodes

**RPC Code:** RPC-Async-V1-01, RPC-Put-V1-11

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Validates that PUT operations have the correct HTTP response codes:

- **Synchronous PUT** must have exactly responses `200`, `201`, and `default`.
  No additional response codes are allowed.

- **Long-running (LRO) PUT** must have exactly responses `200`, `201`, and `default`.
  The operation must also set `x-ms-long-running-operation: true`.

## Detection Logic

The rule inspects each PUT operation's `responses` object:

1. If `200` is missing → error.
2. If `201` is missing → error.
3. If any response code is not in `[200, 201, default]` → error.

## Test Cases

| ID                        | Violation                    | Description                                               |
| ------------------------- | ---------------------------- | --------------------------------------------------------- |
| `put-extra-response-code` | Missing 201, extra 202 code  | PUT returns 200+202+default but is missing 201            |
