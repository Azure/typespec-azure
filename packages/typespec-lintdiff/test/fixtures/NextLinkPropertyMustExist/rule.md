---
validatorRuleId: NextLinkPropertyMustExist
engine: spectral
tspLints: []
coverageKind: blocked
---

# NextLinkPropertyMustExist

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Validates that when an operation uses `x-ms-pageable` with a `nextLinkName`,
the referenced property actually exists in the 200 response schema.

Treat this local fixture as **blocked / suppression-dependent**. The repro uses
raw `x-ms-pageable` metadata and suppresses `no-openapi`,
`use-standard-names`, and `use-standard-operations`; those prerequisite
suppression needs are stronger evidence than a new common-surface lint here.

## Detection Logic

The rule inspects each operation that has `x-ms-pageable`:

1. Read `nextLinkName` from `x-ms-pageable`.
2. If `nextLinkName` is not null/empty, check the 200 response schema for a
   property with that name.
3. If the property does not exist → warning.

## Test Cases

| ID                         | Violation                        | Description                                                       |
| -------------------------- | -------------------------------- | ----------------------------------------------------------------- |
| `missing-nextlink-property`| nextLink property missing        | Response model lacks the nextLink property referenced by x-ms-pageable |
