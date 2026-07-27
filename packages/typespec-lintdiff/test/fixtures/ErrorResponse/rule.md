---
validatorRuleId: ErrorResponse
engine: spectral
tspLints: []
---

# ErrorResponse

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Error response body should conform to Azure API guidelines. TypeSpec Azure.Core
provides a compliant error response by default.

## Test Cases

| ID                      | Violation | Description                                                |
| ----------------------- | --------- | ---------------------------------------------------------- |
| `non-conforming-error`  | false     | Azure.Core error types produce conforming error responses  |
