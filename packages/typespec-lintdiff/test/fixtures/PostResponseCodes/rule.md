---
validatorRuleId: PostResponseCodes
engine: spectral
tspLints:
  - "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-c\
    odes"
---

# PostResponseCodes

**RPC Code:** RPC-Async-V1-11, RPC-Async-V1-14, RPC-POST-V1-02, RPC-POST-V1-03

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Validates that POST operations have the correct HTTP response codes:

- **Synchronous POST** must have response codes `{200, default}` or `{204, default}`.
  No additional response codes are allowed.

- **Long-running (LRO) POST** must have response codes `{200, 202, default}` or
  `{202, default}`.

## Detection Logic

The rule inspects each POST operation's `responses` object:

1. If the operation is async (has `202`, `x-ms-long-running-operation`, or
   `x-ms-long-running-operation-options`):
   - Must have exactly `[200, 202, default]` or `[202, default]`.
2. Otherwise (sync):
   - Must have exactly `[200, default]` or `[204, default]`.

## Test Cases

| ID               | Violation   | Description                                           |
| ---------------- | ----------- | ----------------------------------------------------- |
| `post-extra-201` | Extra 201   | Sync POST action returns 201, not in the allowed set  |
