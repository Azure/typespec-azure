# PathParameterNames migration

## Conclusion

The migrated TypeSpec rule is functionally equivalent to the Swagger
`PathParameterNames` rule for authorable TypeSpec APIs after the changes in this
migration. The TypeSpec rule required five corrections:

- Apply the rule only to data-plane services. The Swagger rule is not enabled
  by the ARM ruleset.
- Evaluate each emitted path once and keep parameter-name consistency state per
  HTTP service/OpenAPI document. Swagger traverses each `paths` key once, even
  when several HTTP methods share it.
- Evaluate versioned services one projected API version at a time so routes
  that never coexist are not compared.
- Exclude literal-query routes because AutoRest emits them under `x-ms-paths`,
  outside the Swagger rule's `$.paths` target.
- Evaluate unique paths in AutoRest's deterministic URL order so the same
  parameter name establishes the expected value on both sides.

The final rule traverses HTTP services, skips services with an ARM provider,
projects versioned services, and deduplicates normalized paths within each
service document. It continues to report on the path parameter whose name is
inconsistent and reports a persistent source inconsistency only once across
versions.

## Required changes

- Update `src/rules/path-parameter-names.ts` to scope the rule per HTTP service,
  exclude ARM services, project each service version, and process shared paths
  once in emitted URL order while excluding `x-ms-paths` routes.
- Add a shared-path fixture proving that two methods on one emitted path
  produce one diagnostic.
- Add focused tests for data-plane violations, shared-path deduplication, ARM
  exclusion, version projection, cross-version deduplication, distinct paths or
  services that reuse one parameter property, literal-query exclusion, and
  emitted path ordering.

No emitter, validator, or report-generator change is required.

## Report revisions and reconciliation

The historical migration report is
[`docs/coverage_old.md`](../../../docs/coverage_old.md). It records 450 compiled
projects and 210 validator rules, but does not embed the spec commit, generation
time, generator revision, per-project results, or raw diagnostic totals.

The checked-in observed report is
[`specs/coverage-breakdown.md`](../../../specs/coverage-breakdown.md), generated
from `Azure/azure-rest-api-specs` commit
`f6b53f105b95da05276530a0754a1c71b4f16397`. Its validator snapshot was generated
on 2026-08-06 by `test/harness/spec-dataset.ts` and contains 468 successfully
validated projects. The checked-in coverage report was generated on 2026-08-10;
462 of 468 TypeSpec projects compiled.

The final full rerun with the corrected rule temporarily regenerated those
coverage artifacts at 2026-08-14T05:57:59Z from a checkout based on migration
base commit `a353796e05aa5b28fb7abae17566ae79b047e2c2` with the rule changes
documented here applied. It again compiled 462 of 468 projects. Per the
rule-development workflow, the generated corpus artifacts are restored rather
than included in this change; the final rerun row is transcribed below.

| Evidence                                        | Mode and coverage definition                                                          | Validator projects | TypeSpec projects |      Overlap | Validator only      | TypeSpec only       | Raw validator diagnostics | Raw TypeSpec diagnostics |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | -----------------: | ----------------: | -----------: | ------------------- | ------------------- | ------------------------: | -----------------------: |
| Historical `coverage_old.md`                    | Mixed migration disposition; project overlap is not reported                          |                 38 |                30 | Not reported | Not reconstructable | Not reconstructable |              Not reported |             Not reported |
| Checked-in `coverage-breakdown.md`              | Observed same-project diagnostics before correction; production ARM validator command |                  0 |               102 |            0 | None                | 102 projects        |                         0 |                    3,180 |
| Final full rerun (generated artifacts restored) | Observed same-project diagnostics after correction; production ARM validator command  |                  0 |                 0 |            0 | None                | None                |                         0 |                        0 |

The historical 78.9% value is `30 / 38`; it is not evidence of eight known
validator-only projects because the report provides only aggregate counts. Those
project identities cannot be reconstructed by subtraction.

The historical and current rows differ for concrete reasons:

1. They use different snapshots and project populations: 450 compiled projects
   historically versus 468 validator projects and 462 TypeSpec projects now.
2. The current validator dataset explicitly invokes AutoRest with
   `--openapi-type=arm --openapi-subtype=arm`. `PathParameterNames` is a
   data-plane-only validator rule, so it cannot fire in this run.
3. The reports use different coverage definitions. The historical report
   records migration coverage, while the current report requires observed
   same-project diagnostics.
4. The checked-in coverage row before this correction contained 3,180
   diagnostics in 102 successfully compiled projects. Its all-project TypeSpec
   shard contained 3,722 diagnostics in 106 projects (1,199 unique
   project/source/line/column identities); the difference is diagnostics from
   projects excluded from aligned coverage because compilation failed. These
   were ARM-service false positives rather than evidence that the data-plane
   Swagger rule fired. AppService alone contributed 1,258 raw diagnostics.

## Aligned project and diagnostic comparison

For the current ARM validator execution mode, the aligned applicable project
sets are empty:

- Validator projects: none.
- TypeSpec projects: none after ARM-service exclusion.
- Overlap, validator-only, and TypeSpec-only projects: none.

Raw and conservatively deduplicated totals are therefore all zero. There are no
current cardinality outliers. The large pre-change TypeSpec-only outliers were
caused by running a data-plane semantic check over ARM services; service-level
ARM detection removes that scope mismatch.

Six TypeSpec projects failed compilation:

| Project                                                                                    | First compiler failure             |
| ------------------------------------------------------------------------------------------ | ---------------------------------- |
| `deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body`    |
| `monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param` |
| `network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param` |
| `quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param` |
| `resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body`    |
| `servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body`    |

All six are ARM projects. They must remain recorded as failures, but they do not
remove an applicable data-plane project from this rule's current comparison.

## Fixture and real-service evidence

The fixture suite covers three violating shapes and one compliant control:

- Two normalized paths use different names for the same segment.
- Nested paths use different names for the same repeated segment after
  unrelated parent segments.
- GET and DELETE share one inconsistent emitted path and produce one diagnostic.
- Consistent parameter names produce no target-rule diagnostic.

The focused linter tests additionally prove that the rule diagnoses a data-plane
service, deduplicates a shared emitted path, and ignores an ARM provider service.
They also prove that mutually exclusive versioned routes are not compared and
that a persistent inconsistency is reported once across versions, without
collapsing distinct paths that reuse the same source parameter or suppressing
independent service documents. The focused tests also prove that literal-query
routes are excluded and that path ordering matches AutoRest's emitted document.
The cross-validator fixture snapshots agree on the target rule's violating and
compliant outcomes.

As a real-service regression check, AppService was the largest pre-change
outlier with 1,258 raw target diagnostics in the all-project shard. The
service-scoped ARM filter reduces this rule to zero target diagnostics in the
full refreshed corpus.

## Remaining uncertainty

Functional equivalence is established for the authorable semantics covered by
the Swagger implementation and fixtures; raw count equality is not the migration
criterion because Swagger reports emitted OpenAPI paths while TypeSpec reports
semantic source targets.

The remaining uncertainty is historical only: the 38 validator projects and 30
TypeSpec projects in `coverage_old.md` cannot be reproduced or inspected from
that aggregate report, and the current ARM-only validator run cannot replace a
data-plane corpus replay. Consequently, this evidence does not claim historical
project-set equivalence. It does show that the corrected TypeSpec rule matches
the Swagger rule's scope and path-level behavior, with no known remaining
semantic gap.
