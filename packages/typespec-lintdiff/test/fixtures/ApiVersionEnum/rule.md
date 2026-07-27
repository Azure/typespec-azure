---
validatorRuleId: ApiVersionEnum
engine: spectral
tspLints: []
---

# ApiVersionEnum

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Validates that the `api-version` parameter does not use an `enum` constraint.
Using an enum for api-version makes it difficult for clients to use newer API
versions without updating the SDK.

## Detection Logic

The rule inspects the `api-version` parameter:

1. If the `api-version` parameter has an `enum` constraint → warning.

## Test Cases

| ID                    | Violation                    | Description                                                         |
| --------------------- | ---------------------------- | ------------------------------------------------------------------- |
| `api-version-as-enum` | api-version uses enum        | Versioned service generates api-version parameter with enum values  |
