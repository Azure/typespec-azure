---
validatorRuleId: GuidUsage
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/guid-usage
coverageKind: lint
---

# GuidUsage

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

Properties should not use `format: uuid`. GUIDs are not recommended for Azure resource
properties as they are difficult to work with for customers.

## Semantic coverage notes

The upstream ARM Spectral rule flags any emitted OpenAPI schema or parameter that carries
`format: uuid`. The local native lint covers the authorable TypeSpec surfaces that produce those
UUID schemas:

- resource and request model properties typed as `uuid`
- operation parameters typed as `uuid`
- direct request bodies typed as `uuid`
- direct success response bodies typed as `uuid`
- custom scalars and array containers that eventually emit `format: uuid`

The validator reports imported definition sites such as `Azure.Core.uuid`; the local lint reports
the authored TypeSpec property or operation that causes that UUID schema to be emitted. Imported
library-only UUID definitions are not treated as author-authored migration targets.

## Test Cases

| ID                     | Violation | Description |
| ---------------------- | --------- | ----------- |
| `uuid-property`        | yes       | Resource property uses `uuid` directly |
| `uuid-query-parameter` | yes       | ARM action query parameter uses `uuid` |
| `uuid-body`            | yes       | ARM action request body is typed as `uuid` |
| `uuid-response`        | yes       | ARM action returns a direct `uuid` payload |
| `uuid-custom-scalar`   | yes       | Property uses a custom scalar that extends `uuid` |
| `uuid-array-property`  | yes       | Resource property uses an array of `uuid` values |
| `non-uuid-shapes`      | no        | Comparable string-based shapes stay compliant |
