---
engine: spectral
tspLints:
- '@azure-tools/typespec-azure-resource-manager/secret-prop'
validatorRuleId: XMSSecretInResponse
coverageKind: lint
officialTspLints:
- '@azure-tools/typespec-azure-resource-manager/secret-prop'
---

# XMSSecretInResponse

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Response properties whose names suggest secrets (e.g. password, key, token, credentials, secret,
auth, connection) must have `x-ms-secret: true` set.

## Test Cases

| ID                           | Violation                     | Description                                                      |
| ---------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `secret-property-in-response`| Missing x-ms-secret           | WidgetProperties has a "password" property without x-ms-secret   |
