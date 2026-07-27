---
validatorRuleId: LroLocationHeader
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-resource-manager/lro-location-header'
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/lro-location-header'
---

# LroLocationHeader

**RPC Code:** RPC-Async-V1-07

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Validates that 202 responses include a `Location` response header. The Location header is
required for long-running operation (LRO) polling, as it provides the URL where clients can
check the status of the asynchronous operation.

## Detection Logic

The rule inspects each operation's `responses` object:

1. If a `202` response exists, it must have a `Location` header defined in its `headers`.
2. If the `Location` header is missing → error.

## Test Cases

| ID                        | Violation               | Description                                                  |
| ------------------------- | ----------------------- | ------------------------------------------------------------ |
| `missing-location-header` | Missing Location header | Custom LRO delete returns 202 without a Location header      |
