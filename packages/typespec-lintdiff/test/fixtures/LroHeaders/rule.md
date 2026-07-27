---
validatorRuleId: LroHeaders
engine: spectral
tspLints: []
---

# LroHeaders

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

A 202 response should include an Operation-Location response header.
TypeSpec Azure.Core LRO templates automatically include this header.

## Test Cases

| ID                            | Violation | Description                                               |
| ----------------------------- | --------- | --------------------------------------------------------- |
| `missing-operation-location`  | false     | Azure.Core LRO includes Operation-Location header         |
