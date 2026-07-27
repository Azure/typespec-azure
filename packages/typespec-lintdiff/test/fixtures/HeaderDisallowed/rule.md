---
validatorRuleId: HeaderDisallowed
engine: spectral
tspLints: []
---

# HeaderDisallowed

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Authorization, Content-Type, and Accept headers should not be defined explicitly.
TypeSpec does not emit explicit Authorization headers by default.

## Test Cases

| ID                      | Violation | Description                                        |
| ----------------------- | --------- | -------------------------------------------------- |
| `explicit-auth-header`  | false     | TypeSpec does not emit explicit Authorization header|
