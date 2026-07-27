---
validatorRuleId: SuccessResponseBody
engine: spectral
tspLints: []
tspRuleset: data-plane
---

# SuccessResponseBody

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

All success responses except 202 and 204 should define a response body.
A GET operation returning 200 without a body schema triggers this rule.

## TypeSpec source notes

We inspected
`typespec-azure/packages/typespec-azure-core/src/rules/no-response-body.ts`,
which defines `@azure-tools/typespec-azure-core/no-response-body`.
That native rule is close, but not equivalent: it checks non-`204` responses for
missing bodies and does not preserve the validator rule's explicit `202` allowance.

Because of that scope difference, `SuccessResponseBody` stays unmapped even though the
native rule overlaps on common `200`-without-body cases.

## Test Cases

| ID                        | Violation | Description                                        |
| ------------------------- | --------- | -------------------------------------------------- |
| `success-without-body`    | true      | GET operation returns `200` without a response body |
