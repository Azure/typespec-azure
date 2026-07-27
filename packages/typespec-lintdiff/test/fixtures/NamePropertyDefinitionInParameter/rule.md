---
validatorRuleId: NamePropertyDefinitionInParameter
engine: spectral
tspLints: []
---

# NamePropertyDefinitionInParameter

**Severity:** error

**Applies to:** Both ARM and DataPlane

Parameters must have a name property.

## Source-of-truth notes

- Upstream treats a parameter `$ref` as compliant when the referenced parameter
  definition contains a non-empty `name`; its unit test covers a local
  `#/parameters/ApiVersionParameter` reference as valid.
- The compiled Spectral function only checks `parameter.name` on each array entry.
  When the validator sees unresolved external common-types parameter `$ref`s, it
  reports them as missing `name`.

## Current outcome

- The ARM control fixture emits the normal external common-types parameter refs used
  by ARM TypeSpec output.
- The current validator run still reports three
  `NamePropertyDefinitionInParameter` errors on those `$ref` entries, so this is not
  trustworthy evidence of an authorable TypeSpec violation.
- The harness now records that reviewed validator-only discrepancy explicitly in
  `expect.json`, so the residual report treats it as settled evidence instead of an
  unexplained active compliance failure.
- Treat this rule as a **test-quality issue / validator discrepancy** locally for
  now. No new native TypeSpec lint is justified unless the validator or harness
  behavior changes.

| ID          | Violation | Description                                        |
| ----------- | --------- | -------------------------------------------------- |
| `compliant` | false     | Intended compliant ARM control; reviewed validator discrepancy on external common-types parameter `$ref`s |
