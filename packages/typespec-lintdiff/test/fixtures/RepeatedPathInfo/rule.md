---
validatorRuleId: RepeatedPathInfo
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/repeated-path-info
---

# RepeatedPathInfo

**Severity:** error

**Applies to:** Resource Manager (ARM)

Request body must not repeat information already in path or query parameters.

## Semantic coverage notes

The authorable semantic matrix covered locally is:

- PUT resource body repeats a path parameter inside `properties` => invalid
- PUT resource body repeats a query parameter inside `properties` => invalid
- PUT resource body repeats multiple path parameters => multiple invalid diagnostics
- PUT resource body inherits a repeated path parameter through `properties` model inheritance => invalid
- tenant-scoped PUT resource repeats its path parameter inside `properties` => invalid
- compliant PUT body with distinct `properties` members => valid
- repeated property only in PATCH/update payload => valid for this rule

Additional scope note:

- A duplicate top-level resource envelope property is not a clean authorable ARM compliance case in TypeSpec because the existing `arm-resource-invalid-envelope-property` lint rejects it before this rule matters. The local fixture keeps that boundary documented but it should not be treated as a migration gap.

| ID                              | Violation | Description                                                  |
| ------------------------------- | --------- | ------------------------------------------------------------ |
| `body-repeats-path`             | true      | Body property repeats path parameter name                    |
| `body-repeats-path-in-base`     | true      | Repeated path parameter comes from an inherited properties model |
| `body-repeats-query`            | true      | Body property repeats a PUT query parameter                  |
| `body-repeats-multiple-paths`   | true      | Body properties repeat more than one path parameter          |
| `tenant-body-repeats-path`      | true      | Tenant-scoped PUT body repeats the resource path parameter   |
| `body-no-repeats`               | false     | PUT request body uses a standard properties bag with no duplicates |
| `top-level-body-property-only`  | false     | Duplicate only exists at the top level, outside `properties` |
| `patch-body-repeats-path`       | false     | Duplicate only exists in PATCH payload, not PUT              |
