---
validatorRuleId: AvoidMsdnReferences
engine: spectral
tspLints: []
---

# AvoidMsdnReferences

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Validates that descriptions do not contain references to msdn.microsoft.com or docs.microsoft.com URLs.

## Test Cases

| ID                       | Violation | Description                                          |
| ------------------------ | --------- | ---------------------------------------------------- |
| `msdn-url-in-description`| true      | Model description contains an MSDN URL               |
