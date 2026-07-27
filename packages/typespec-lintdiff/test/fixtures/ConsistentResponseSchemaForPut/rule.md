---
validatorRuleId: ConsistentResponseSchemaForPut
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/consistent-response-schema-for-put
coverageKind: lint
officialTspLints:
  - '@azure-tools/typespec-azure-core/response-schema-problem'
tspRuleset: resource-manager
---

# ConsistentResponseSchemaForPut

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

PUT operations must return the same schema for both `200` and `201` responses.
Returning different schemas for initial create and later replace success responses is
not allowed.

## Source-of-truth notes

- Upstream `azure-openapi-validator` registers this rule in the ARM Spectral ruleset
  with severity `error`, selector `$.paths.*`, and a function that only inspects
  `pathItem.put`.
- The implementation reports only when both `responses["201"].schema` and
  `responses["200"].schema` exist and are different. If either status code is
  missing, the validator stays silent.
- The implementation compares resolved schema objects directly rather than doing a
  deeper structural comparison. The local lint mirrors that authorable boundary by
  requiring the same TypeSpec response body type on both statuses.
- The upstream unit tests cover the two core cells explicitly: differing `200`/`201`
  schemas fail, and matching `200`/`201` schemas pass.

## Semantic coverage notes

- The local `tsp-lintdiff-local-linter/consistent-response-schema-for-put` rule now
  mirrors the validator's exact ARM scope: PUT only, exact `200`/`201` pairing only,
  and no diagnostics when one of those statuses is absent.
- `@azure-tools/typespec-azure-core/response-schema-problem` still has broader
  conceptual overlap, but it is intentionally **not** the verified mapping for this
  ARM rule because it also fires on non-PUT operations and on other success-status
  pairings such as `200`/`202`.
- The local fixtures cover the reconstructed semantic matrix:
  - PUT `200`/`201` different schemas => violation
  - PUT `200`/`201` same schema => compliant
  - PUT `200`/`202` different schemas => compliant
  - PUT with only `201` => compliant
  - POST `200`/`201` different schemas => compliant

## Test Cases

| ID | Violation | Description |
| --- | --- | --- |
| `different-put-responses` | true | ARM PUT returns different `200` and `201` resource schemas |
| `same-put-responses` | false | ARM PUT returns the same schema for both `200` and `201` responses |
| `put-200-202-different-schemas` | false | ARM PUT returns different `200` and `202` schemas; the validator ignores `202` |
| `put-only-201-response` | false | ARM PUT returns only a `201` schema; the validator does not require a matching `200` |
| `post-200-201-different-schemas` | false | ARM POST returns different `200` and `201` schemas; the validator is PUT-only |
