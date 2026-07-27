---
validatorRuleId: LongRunningResponseStatusCodeDataPlane
engine: spectral
tspLints: []
---

# LongRunningResponseStatusCodeDataPlane

**Severity:** error

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Long-running data-plane operations must include at least one verb-specific
terminal success status code:

- `delete`: `200`, `202`, or `204`
- `post`: `200`, `201`, `202`, or `204`
- `put`: `200`, `201`, or `202`
- `patch`: `200`, `201`, or `202`

## Source-of-truth notes

- Upstream data-plane registration (`packages/rulesets/src/spectral/az-dataplane.ts`)
  runs this rule on OAS2 operations with `x-ms-long-running-operation: true`.
- The shared Spectral function
  (`functions/Extensions/long-running-response-status-code.ts`) checks only the
  response-code matrix above; despite the registration description text, it does
  not inspect `x-ms-long-running-operation-options`.
- Upstream unit tests explicitly treat a DELETE LRO with only `202` as valid,
  while DELETE `201`, POST `default`, and PUT/PATCH `204` reproduce the rule.

## Local migration notes

- The only local case, `lro-missing-status-codes`, was stale as a violation
  repro. Its generated OpenAPI is a DELETE LRO with only a `202` response, and
  upstream treats that shape as compliant, so the previous `expect.json`
  violation flag was incorrect.
- That fixture also suppresses
  `@azure-tools/typespec-azure-core/use-standard-operations`,
  `@azure-tools/typespec-azure-core/no-openapi`, and
  `@azure-tools/typespec-azure-core/long-running-polling-operation-required` to
  author a raw `x-ms-long-running-operation` extension, so it is not a clean
  basis for claiming a native lint gap.
- After correcting the expectation, the fixture serves only as a compliance
  control. The repository still lacks a trustworthy violating TypeSpec repro for
  the upstream invalid status-code matrix.

Treat this rule as a **test-quality issue** locally for now. The stale fixture
was fixed, but there is still not enough trustworthy local evidence to justify
native lint work.

## Test Cases

| ID                         | Violation | Description |
| -------------------------- | --------- | ----------- |
| `lro-missing-status-codes` | false | Historical case name is stale; the emitted DELETE LRO has only `202`, which upstream accepts as valid. |
