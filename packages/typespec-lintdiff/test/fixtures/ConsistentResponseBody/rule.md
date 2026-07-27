---
validatorRuleId: ConsistentResponseBody
engine: spectral
tspLints: []
---

# ConsistentResponseBody

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

GET, PUT, and PATCH operations on a resource should return the same response body schema.
TypeSpec naturally produces consistent schemas when using the same model for all operations.

## Test Cases

| ID                           | Violation | Description                                     |
| ---------------------------- | --------- | ----------------------------------------------- |
| `different-response-schemas` | false     | TypeSpec uses same model so schemas are consistent |
